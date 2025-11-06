#!/usr/bin/env python3
"""
Fix common PostgreSQL schema conversion issues
Fixes SERIAL, bit types, foreign keys, DROP statements, etc.
"""

import re
import sys
import argparse

def fix_schema_issues(sql_content, schema_name='kulman'):
    """
    Fix common MySQL to PostgreSQL conversion issues
    """
    content = sql_content
    
    # 1. Fix SERIAL syntax issues: bigint(20) NOT NULL SERIAL -> BIGSERIAL
    # Pattern: bigint(20) NOT NULL  SERIAL or bigint(20) NOT NULL SERIAL
    content = re.sub(
        r'bigint\(\d+\)\s+NOT\s+NULL\s+SERIAL',
        'BIGSERIAL',
        content,
        flags=re.IGNORECASE
    )
    
    # Fix: int(11) NOT NULL SERIAL -> SERIAL
    content = re.sub(
        r'int\(\d+\)\s+NOT\s+NULL\s+SERIAL',
        'SERIAL',
        content,
        flags=re.IGNORECASE
    )
    
    # 2. Fix bit(1) type to BOOLEAN
    content = re.sub(
        r'\bbit\(1\)',
        'BOOLEAN',
        content,
        flags=re.IGNORECASE
    )
    
    # 3. Fix bit literals: b'0' -> FALSE, b'1' -> TRUE
    content = re.sub(r"b'0'", 'FALSE', content, flags=re.IGNORECASE)
    content = re.sub(r"b'1'", 'TRUE', content, flags=re.IGNORECASE)
    
    # 4. Fix MySQL data type sizes (remove them for PostgreSQL)
    # tinyint(1) -> BOOLEAN (for boolean-like columns)
    content = re.sub(r'\btinyint\(1\)', 'BOOLEAN', content, flags=re.IGNORECASE)
    # tinyint(n) where n > 1 -> SMALLINT
    content = re.sub(r'\btinyint\(\d+\)', 'SMALLINT', content, flags=re.IGNORECASE)
    # smallint(n) -> SMALLINT (remove size parameter)
    content = re.sub(r'\bsmallint\(\d+\)', 'SMALLINT', content, flags=re.IGNORECASE)
    # bigint(20) -> BIGINT
    content = re.sub(r'bigint\(\d+\)', 'BIGINT', content, flags=re.IGNORECASE)
    # int(11) -> INTEGER
    content = re.sub(r'\bint\(\d+\)', 'INTEGER', content, flags=re.IGNORECASE)
    # decimal(10,0) -> DECIMAL(10,0) (keep this one as is)
    # varchar(n) -> VARCHAR(n) (keep as is)
    
    # 5. Fix DROP TABLE statements for tables with spaces
    # DROP TABLE IF EXISTS Table Name -> DROP TABLE IF EXISTS "Table Name"
    def fix_drop_table(match):
        table_name = match.group(1)
        # If table name has spaces or special chars, add quotes
        if ' ' in table_name or not table_name.replace('_', '').replace('.', '').isalnum():
            return f'DROP TABLE IF EXISTS "{table_name}";'
        return match.group(0)
    
    content = re.sub(
        r'DROP TABLE IF EXISTS ([^;]+);',
        fix_drop_table,
        content,
        flags=re.IGNORECASE
    )
    
    # 6. Fix CREATE TABLE statements for tables with spaces (add quotes)
    # CREATE TABLE IF NOT EXISTS kulman.Table Name -> CREATE TABLE IF NOT EXISTS kulman."Table Name"
    def fix_create_table_line(line):
        # Match: CREATE TABLE IF NOT EXISTS kulman.Table Name (
        # Need to match table name that may have spaces
        pattern = r'CREATE TABLE IF NOT EXISTS\s+([\w]+)\.([^\(]+)\s*\('
        match = re.search(pattern, line, re.IGNORECASE)
        if match:
            schema = match.group(1)
            table_name = match.group(2).strip()
            
            # If table name has spaces and is not already quoted, add quotes
            if ' ' in table_name and not (table_name.startswith('"') and table_name.endswith('"')):
                return re.sub(
                    rf'{re.escape(schema)}\.{re.escape(table_name)}',
                    f'{schema}."{table_name}"',
                    line,
                    flags=re.IGNORECASE
                )
        return line
    
    # Apply fix line by line
    lines = content.split('\n')
    fixed_lines = []
    for line in lines:
        if 'CREATE TABLE IF NOT EXISTS' in line:
            fixed_lines.append(fix_create_table_line(line))
        else:
            fixed_lines.append(line)
    content = '\n'.join(fixed_lines)
    
    # 7. Fix column names with spaces in CREATE TABLE
    # Fix column definitions: Column Name type -> "Column Name" type
    def fix_column_line(line):
        # Match column definition lines (indented lines with spaces in column name)
        # Pattern: spaces, column name (can have spaces), space, type (date, varchar(n), etc.), rest
        # Example: "  Employment Start Date date DEFAULT NULL,"
        # Match: spaces + column name with spaces + space + type + rest
        
        # First, check if line has a column name with spaces followed by a known type
        types = ['date', 'varchar', 'decimal', 'bigint', 'int', 'integer', 'text', 'boolean', 'timestamp', 'serial', 'bigserial', 'smallint', 'tinyint']
        for type_name in types:
            # Match: spaces + column name with spaces + space + type (with optional params) + rest
            pattern = rf'^(\s+)([^\s]+(?:\s+[^\s]+)+)\s+({type_name}(?:\([^)]+\))?)\s+(.*)$'
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                indent = match.group(1)
                column_name = match.group(2)
                type_def = match.group(3)
                rest = match.group(4)
                
                # If column name has spaces and is not already quoted, add quotes
                if ' ' in column_name and not (column_name.startswith('"') and column_name.endswith('"')):
                    return f'{indent}"{column_name}" {type_def} {rest}'
        
        # Also check for simple column names (no spaces) that need type fixing
        # This handles cases where the type itself needs adjustment
        return line
    
    # Apply column fix line by line
    lines = content.split('\n')
    fixed_lines = []
    in_create_table = False
    for i, line in enumerate(lines):
        if 'CREATE TABLE' in line:
            in_create_table = True
            fixed_lines.append(line)
        elif in_create_table:
            if line.strip() == ');' or line.strip() == ')' or line.strip().startswith('PRIMARY KEY') or line.strip().startswith('CONSTRAINT'):
                in_create_table = False
                fixed_lines.append(line)
            else:
                # Try to fix column name if it has spaces
                fixed_lines.append(fix_column_line(line))
        else:
            fixed_lines.append(line)
    content = '\n'.join(fixed_lines)
    
    # 8. Fix foreign key references to include schema prefix if needed
    # This is tricky - we need to check if the referenced table is in the kulman schema
    # For now, if it starts with m_, assume it's in kulman schema
    # REFERENCES m_client -> REFERENCES kulman.m_client
    content = re.sub(
        r'REFERENCES\s+(m_\w+)',
        rf'REFERENCES {schema_name}.\1',
        content,
        flags=re.IGNORECASE
    )
    
    # Also fix references to acc_ tables
    content = re.sub(
        r'REFERENCES\s+(acc_\w+)',
        rf'REFERENCES {schema_name}.\1',
        content,
        flags=re.IGNORECASE
    )
    
    # 9. Fix PRIMARY KEY and FOREIGN KEY constraint column names with spaces
    # PRIMARY KEY (Column Name) -> PRIMARY KEY ("Column Name")
    def fix_key_columns(match):
        key_type = match.group(1)
        columns = match.group(2)
        
        # Check if any column has spaces
        column_list = [col.strip() for col in columns.split(',')]
        fixed_columns = []
        
        for col in column_list:
            if ' ' in col or not col.replace('_', '').replace('.', '').isalnum():
                fixed_columns.append(f'"{col}"')
            else:
                fixed_columns.append(col)
        
        return f'{key_type} ({", ".join(fixed_columns)})'
    
    content = re.sub(
        r'(PRIMARY KEY|FOREIGN KEY)\s*\(([^)]+)\)',
        fix_key_columns,
        content,
        flags=re.IGNORECASE
    )
    
    # 10. Fix default values that might have issues
    # Remove backticks in column definitions
    content = re.sub(r'`([^`]+)`', r'\1', content)
    
    # 11. Fix numeric default values (remove quotes from numeric defaults)
    # DEFAULT '1' -> DEFAULT 1 (for numeric types)
    # But be careful not to break string defaults
    def fix_numeric_default(match):
        default_value = match.group(1)
        # Check if it's a numeric value in quotes
        if default_value.startswith("'") and default_value.endswith("'"):
            inner_value = default_value[1:-1]
            # If it's a number, remove quotes
            if inner_value.replace('.', '').replace('-', '').isdigit():
                return f'DEFAULT {inner_value}'
        return match.group(0)
    
    # Match DEFAULT 'numeric_value' patterns
    content = re.sub(
        r'DEFAULT\s+(\'[0-9.-]+\')',
        fix_numeric_default,
        content,
        flags=re.IGNORECASE
    )
    
    # 12. Remove MySQL-specific column options
    # Remove CHARACTER SET from column definitions
    content = re.sub(r'\s+CHARACTER\s+SET\s+\w+', '', content, flags=re.IGNORECASE)
    # Remove COLLATE from column definitions
    content = re.sub(r'\s+COLLATE\s+\w+(?:_\w+)*', '', content, flags=re.IGNORECASE)
    # Remove COMMENT clauses from column definitions
    # COMMENT 'text' -> (remove entire COMMENT clause)
    # Simple pattern: match COMMENT followed by single-quoted string
    # This handles most cases, including escaped quotes inside comments
    content = re.sub(
        r'\s+COMMENT\s+\'[^\']*\'',
        '',
        content,
        flags=re.IGNORECASE
    )
    
    # Fix unmatched quotes on column definitions (if any were incorrectly added)
    # Only fix lines that have opening quote but don't have closing quote before comma/end
    lines = content.split('\n')
    fixed_lines = []
    for line in lines:
        # Check for lines with opening quote but no closing quote (unmatched)
        # Pattern: "column_name type (without closing quote)
        if '"' in line and line.count('"') % 2 != 0:
            # Check if it's a column definition line
            if re.match(r'^\s+"[^"]+\s+\w+', line):
                # Remove the unmatched opening quote
                line = re.sub(r'^(\s+)"([^\s"]+)\s', r'\1\2 ', line)
        fixed_lines.append(line)
    content = '\n'.join(fixed_lines)
    
    # 13. Remove MySQL-specific table options
    content = re.sub(r'ENGINE\s*=\s*\w+[^;]*', '', content, flags=re.IGNORECASE)
    content = re.sub(r'DEFAULT\s+CHARSET\s*=\s*\w+[^;]*', '', content, flags=re.IGNORECASE)
    content = re.sub(r'COLLATE\s*=\s*\w+[^;]*', '', content, flags=re.IGNORECASE)
    
    # 14. Fix trailing commas before closing parentheses in CREATE TABLE
    # Remove comma before ); in table definitions
    # Pattern: match column_definition,\n followed by );
    content = re.sub(
        r',(\s*\n\s*\);)',
        r'\1',
        content,
        flags=re.MULTILINE
    )
    
    # 15. Fix trailing semicolons after closing parens
    content = re.sub(r'\)\s*;', ');', content)
    
    # 16. Fix standalone UNIQUE keywords (invalid syntax)
    # Remove lines that contain only UNIQUE (possibly with trailing space)
    # But keep UNIQUE KEY and UNIQUE (column) patterns
    def fix_standalone_unique(line):
        # Match: spaces + UNIQUE + optional spaces + end of line or comma
        # But NOT UNIQUE KEY or UNIQUE (column)
        pattern = r'^(\s+)UNIQUE\s*$'
        if re.match(pattern, line):
            # Check if next line is CONSTRAINT - if so, just remove the UNIQUE line
            return None  # Return None to remove this line
        # Also handle UNIQUE followed by CONSTRAINT on next line
        pattern_with_constraint = r'^(\s+)UNIQUE\s*\n\s+CONSTRAINT'
        return line
    
    # Remove standalone UNIQUE lines
    lines = content.split('\n')
    fixed_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # Check if this is a standalone UNIQUE line
        if re.match(r'^\s+UNIQUE\s*$', line):
            # Check if next line starts with CONSTRAINT
            if i + 1 < len(lines) and lines[i + 1].strip().startswith('CONSTRAINT'):
                # Skip this UNIQUE line, keep the CONSTRAINT
                i += 1
                continue
            else:
                # Just remove the standalone UNIQUE
                i += 1
                continue
        fixed_lines.append(line)
        i += 1
    content = '\n'.join(fixed_lines)
    
    # Also handle UNIQUE KEY patterns that might need conversion
    # UNIQUE KEY name (columns) -> UNIQUE (columns)
    # Also handle UNIQUE KEY name name2 (columns) -> UNIQUE (columns)
    content = re.sub(
        r'UNIQUE\s+KEY\s+[\w\s]+\(',
        r'UNIQUE (',
        content,
        flags=re.IGNORECASE
    )
    
    # 17. Remove foreign key constraints from CREATE TABLE and prepare for ALTER TABLE
    # We'll comment them out and add them at the end
    # Store FK constraints for later
    fk_constraints = []
    
    def extract_fk(match):
        full_match = match.group(0)
        # Extract constraint name, columns, and referenced table
        constraint_match = re.search(
            r'CONSTRAINT\s+(\w+)\s+FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([\w"\.]+)\s*\(([^)]+)\)',
            full_match,
            re.IGNORECASE
        )
        if constraint_match:
            constraint_name = constraint_match.group(1)
            fk_columns = constraint_match.group(2)
            ref_table = constraint_match.group(3)
            ref_columns = constraint_match.group(4)
            
            # Store for later (we'll need to find the table name)
            fk_constraints.append({
                'constraint': full_match,
                'name': constraint_name,
                'columns': fk_columns,
                'ref_table': ref_table,
                'ref_columns': ref_columns
            })
        return ''  # Remove from CREATE TABLE
    
    # Extract FKs - we'll handle this more carefully
    # For now, just replace with comment that we'll add them later
    # Pattern: CONSTRAINT name FOREIGN KEY (...) REFERENCES table (...)
    lines = content.split('\n')
    output_lines = []
    current_table = None
    in_create_table = False
    
    for i, line in enumerate(lines):
        # Detect CREATE TABLE - handle quoted table names with spaces
        # Match: CREATE TABLE IF NOT EXISTS kulman."Table Name" or kulman.table_name
        create_match = re.search(r'CREATE TABLE IF NOT EXISTS\s+([\w\.]+\.)?("?[^"]+"?|[\w]+)', line, re.IGNORECASE)
        if create_match:
            schema_part = create_match.group(1) or ''
            table_name = create_match.group(2)
            current_table = f"{schema_part}{table_name}" if schema_part else table_name
            in_create_table = True
            output_lines.append(line)
            continue
        
        if in_create_table:
            # Track column definitions
            # Check if this is a column definition (not PRIMARY KEY or CONSTRAINT)
            if not line.strip().startswith('PRIMARY KEY') and not line.strip().startswith('CONSTRAINT') and not line.strip().startswith('UNIQUE'):
                # Extract column name if it's a column definition
                col_match = re.match(r'^\s+(?:"?([^"\s]+)"?|([^"\s]+))\s+(\w+)', line)
                if col_match:
                    # It's a column definition - we can track these later if needed
                    pass
            
            # Check if this is a foreign key constraint line
            if 'CONSTRAINT' in line and 'FOREIGN KEY' in line and 'REFERENCES' in line:
                # Extract FK info - handle quoted column names
                fk_match = re.search(
                    r'CONSTRAINT\s+(\w+)\s+FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([\w"\.]+)\s*\(([^)]+)\)',
                    line,
                    re.IGNORECASE
                )
                if fk_match and current_table:
                    constraint_name = fk_match.group(1)
                    fk_columns = fk_match.group(2)
                    ref_table = fk_match.group(3)
                    ref_columns = fk_match.group(4)
                    # Store for adding at end
                    fk_constraints.append({
                        'table': current_table,
                        'name': constraint_name,
                        'columns': fk_columns,
                        'ref_table': ref_table,
                        'ref_columns': ref_columns
                    })
                    # Skip this line (don't add FK to CREATE TABLE)
                    continue
            
            # Check if table ends
            if line.strip() == ');' or line.strip() == ')':
                in_create_table = False
                current_table = None
        
        output_lines.append(line)
    
    # Add FK constraints at the end
    if fk_constraints:
        output_lines.append('')
        output_lines.append('-- Add Foreign Key Constraints')
        output_lines.append('-- Foreign keys are added after all tables are created')
        output_lines.append('')
        for fk in fk_constraints:
            alter_sql = f"ALTER TABLE {fk['table']} ADD CONSTRAINT {fk['name']} FOREIGN KEY ({fk['columns']}) REFERENCES {fk['ref_table']} ({fk['ref_columns']});"
            output_lines.append(alter_sql)
    
    content = '\n'.join(output_lines)
    
    return content

def main():
    parser = argparse.ArgumentParser(
        description='Fix common PostgreSQL schema conversion issues'
    )
    parser.add_argument('input_file', help='Input PostgreSQL schema file')
    parser.add_argument('-o', '--output', help='Output fixed schema file')
    parser.add_argument('--schema', default='kulman', help='Schema name (default: kulman)')
    parser.add_argument('-v', '--verbose', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    # Read input file
    try:
        with open(args.input_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        if args.verbose:
            print(f"Read {len(sql_content)} characters from {args.input_file}")
            
    except FileNotFoundError:
        print(f"Error: File '{args.input_file}' not found")
        sys.exit(1)
    except Exception as e:
        print(f"Error reading file: {e}")
        sys.exit(1)
    
    # Fix issues
    if args.verbose:
        print(f"Fixing schema issues...")
        print(f"  Schema: {args.schema}")
    
    fixed_content = fix_schema_issues(sql_content, args.schema)
    
    # Determine output file
    if args.output:
        output_file = args.output
    else:
        if args.input_file.endswith('.sql'):
            output_file = args.input_file.replace('.sql', '_fixed.sql')
        else:
            output_file = args.input_file + '_fixed.sql'
    
    # Write output
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        
        import os
        input_size = os.path.getsize(args.input_file)
        output_size = os.path.getsize(output_file)
        
        print(f"\n[OK] Schema fixes complete!")
        print(f"  Input:  {args.input_file} ({input_size:,} bytes)")
        print(f"  Output: {output_file} ({output_size:,} bytes)")
        
        if args.verbose:
            print(f"\n  Fixed issues:")
            print(f"    - SERIAL syntax errors")
            print(f"    - bit(1) -> BOOLEAN")
            print(f"    - bit literals -> FALSE/TRUE")
            print(f"    - Foreign key references")
            print(f"    - Table/column names with spaces")
            print(f"    - DROP TABLE statements")
        
    except Exception as e:
        print(f"Error writing output file: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()

