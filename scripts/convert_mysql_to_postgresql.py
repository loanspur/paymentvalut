#!/usr/bin/env python3
"""
MySQL to PostgreSQL Schema Converter
Converts MySQL schema export to PostgreSQL-compatible SQL
"""

import re
import sys
import argparse

def convert_mysql_to_postgresql(mysql_sql, verbose=False):
    """
    Convert MySQL schema SQL to PostgreSQL-compatible SQL
    """
    sql = mysql_sql
    
    if verbose:
        print("Converting MySQL schema to PostgreSQL...")
    
    # Remove MySQL-specific SET commands
    sql = re.sub(r'/\*!.*?\*/', '', sql, flags=re.DOTALL)
    sql = re.sub(r'SET\s+@OLD.*?;', '', sql, flags=re.IGNORECASE | re.DOTALL)
    sql = re.sub(r'SET\s+CHARACTER_SET_CLIENT.*?;', '', sql, flags=re.IGNORECASE)
    sql = re.sub(r'SET\s+NAMES.*?;', '', sql, flags=re.IGNORECASE)
    
    # Remove backticks (MySQL) - PostgreSQL uses double quotes or no quotes
    sql = re.sub(r'`([^`]+)`', r'\1', sql)
    
    # Replace AUTO_INCREMENT with SERIAL/BIGSERIAL
    # This is a basic replacement - may need adjustment based on column type
    def replace_auto_increment(match):
        col_def = match.group(0)
        if 'BIGINT' in col_def.upper():
            return re.sub(r'AUTO_INCREMENT', '', col_def) + ' SERIAL' if 'SERIAL' not in col_def.upper() else col_def.replace('AUTO_INCREMENT', '')
        return col_def.replace('AUTO_INCREMENT', 'SERIAL')
    
    sql = re.sub(r'[A-Za-z_]+\s+.*?AUTO_INCREMENT', replace_auto_increment, sql, flags=re.IGNORECASE)
    
    # Replace data types
    replacements = [
        # TINYINT(1) -> BOOLEAN
        (r'TINYINT\s*\(\s*1\s*\)', 'BOOLEAN'),
        (r'TINYINT\s*\(\s*1\s*\)', 'BOOLEAN'),
        
        # DATETIME -> TIMESTAMP
        (r'DATETIME', 'TIMESTAMP'),
        
        # LONGTEXT -> TEXT
        (r'LONGTEXT', 'TEXT'),
        
        # Remove length from VARCHAR (PostgreSQL doesn't require it for TEXT)
        # Keep VARCHAR(n) as is for compatibility
        
        # Remove unsigned
        (r'\s+UNSIGNED', '', re.IGNORECASE),
        
        # YEAR -> SMALLINT
        (r'YEAR', 'SMALLINT'),
        
        # Remove DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        (r'ON\s+UPDATE\s+CURRENT_TIMESTAMP', '', re.IGNORECASE),
    ]
    
    for pattern, replacement, *flags in replacements:
        flag = flags[0] if flags else 0
        sql = re.sub(pattern, replacement, sql, flags=flag)
    
    # Replace ENGINE and charset declarations
    sql = re.sub(r'ENGINE\s*=\s*\w+[^;]*', '', sql, flags=re.IGNORECASE)
    sql = re.sub(r'DEFAULT\s+CHARSET\s*=\s*\w+[^;]*', '', sql, flags=re.IGNORECASE)
    sql = re.sub(r'COLLATE\s*=\s*\w+[^;]*', '', sql, flags=re.IGNORECASE)
    
    # Handle ENUM types - convert to VARCHAR with CHECK constraint
    # This is simplified - may need manual adjustment for complex ENUMs
    def convert_enum(match):
        enum_values = match.group(1)
        return f'VARCHAR(255) CHECK ({match.group(0)} IN ({enum_values}))'
    
    # Comment out ENUM conversion for now - handle manually
    # sql = re.sub(r"ENUM\s*\(([^)]+)\)", convert_enum, sql, flags=re.IGNORECASE)
    
    # Convert KEY definitions to separate CREATE INDEX statements
    # Extract KEY definitions and create indexes
    key_definitions = re.findall(r'KEY\s+`?(\w+)`?\s*\(([^)]+)\)', sql, re.IGNORECASE)
    
    # Remove KEY definitions from CREATE TABLE
    sql = re.sub(r',\s*KEY\s+`?\w+`?\s*\([^)]+\)', '', sql, flags=re.IGNORECASE)
    sql = re.sub(r'KEY\s+`?\w+`?\s*\([^)]+\)\s*,', '', sql, flags=re.IGNORECASE)
    
    # Convert PRIMARY KEY if inline
    # Keep PRIMARY KEY as is
    
    # Remove MySQL-specific syntax
    sql = re.sub(r'AUTO_INCREMENT\s*=\s*\d+', '', sql, flags=re.IGNORECASE)
    
    # Remove table options
    sql = re.sub(r'COMMENT\s*=\s*\'[^\']*\'', '', sql, flags=re.IGNORECASE)
    
    # Fix CURRENT_TIMESTAMP
    sql = re.sub(r'CURRENT_TIMESTAMP\s*\(\)', 'CURRENT_TIMESTAMP', sql, flags=re.IGNORECASE)
    
    if verbose:
        print("Conversion complete!")
    
    return sql

def extract_key_definitions(mysql_sql):
    """
    Extract KEY definitions and convert to CREATE INDEX statements
    """
    indexes = []
    
    # Find all KEY definitions
    key_matches = re.finditer(
        r'(?:,?\s*)(?:KEY|INDEX)\s+`?(\w+)`?\s*\(([^)]+)\)',
        mysql_sql,
        re.IGNORECASE
    )
    
    table_name = None
    table_match = re.search(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?', mysql_sql, re.IGNORECASE)
    if table_match:
        table_name = table_match.group(1)
    
    for match in key_matches:
        index_name = match.group(1)
        columns = match.group(2)
        
        if table_name:
            index_sql = f"CREATE INDEX IF NOT EXISTS {index_name} ON {table_name}({columns});\n"
            indexes.append(index_sql)
    
    return indexes

def main():
    parser = argparse.ArgumentParser(
        description='Convert MySQL schema SQL to PostgreSQL-compatible SQL'
    )
    parser.add_argument('input_file', help='Input MySQL SQL file')
    parser.add_argument('-o', '--output', help='Output PostgreSQL SQL file')
    parser.add_argument('-v', '--verbose', action='store_true', help='Verbose output')
    parser.add_argument('--schema', default='mifos', help='PostgreSQL schema name (default: mifos)')
    
    args = parser.parse_args()
    
    # Read input file
    try:
        with open(args.input_file, 'r', encoding='utf-8') as f:
            mysql_sql = f.read()
    except FileNotFoundError:
        print(f"Error: File '{args.input_file}' not found")
        sys.exit(1)
    except Exception as e:
        print(f"Error reading file: {e}")
        sys.exit(1)
    
    # Convert schema
    postgresql_sql = convert_mysql_to_postgresql(mysql_sql, args.verbose)
    
    # Extract and convert indexes
    indexes = extract_key_definitions(mysql_sql)
    
    # Add schema prefix
    if args.schema:
        # Add CREATE SCHEMA IF NOT EXISTS
        schema_sql = f"-- PostgreSQL Schema Conversion\n"
        schema_sql += f"CREATE SCHEMA IF NOT EXISTS {args.schema};\n"
        schema_sql += f"SET search_path TO {args.schema}, public;\n\n"
        
        # Add CREATE TABLE with schema prefix
        postgresql_sql = re.sub(
            r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)',
            f'CREATE TABLE IF NOT EXISTS {args.schema}.\\1',
            postgresql_sql,
            flags=re.IGNORECASE
        )
        
        postgresql_sql = schema_sql + postgresql_sql
    
    # Add indexes at the end
    if indexes:
        postgresql_sql += "\n\n-- Indexes\n"
        postgresql_sql += "".join(indexes)
    
    # Determine output file
    output_file = args.output or args.input_file.replace('.sql', '_postgresql.sql')
    
    # Write output
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(postgresql_sql)
        
        print(f"✓ Conversion complete!")
        print(f"  Input:  {args.input_file}")
        print(f"  Output: {output_file}")
        print(f"\n⚠️  IMPORTANT: Review the converted SQL manually before importing!")
        print(f"   Some conversions may need manual adjustment, especially:")
        print(f"   - ENUM types")
        print(f"   - Complex data types")
        print(f"   - Foreign key constraints")
        
    except Exception as e:
        print(f"Error writing output file: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()

