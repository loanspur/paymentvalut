#!/usr/bin/env python3
"""
Fix Common Issues in PostgreSQL Schema Conversion
- Fix SERIAL syntax
- Convert BIT to BOOLEAN
- Fix integer type syntax
- Add missing foreign key columns
- Quote table/column names with spaces
"""

import re
import sys

def fix_serial_syntax(content):
    """Fix incorrect SERIAL syntax like 'bigint(20) NOT NULL SERIAL'"""
    # Pattern: bigint(20) NOT NULL SERIAL → BIGSERIAL
    content = re.sub(
        r'\bbigint\s*\(\s*\d+\s*\)\s+NOT\s+NULL\s+SERIAL',
        'BIGSERIAL',
        content,
        flags=re.IGNORECASE
    )
    # Pattern: bigint(20) SERIAL → BIGSERIAL  
    content = re.sub(
        r'\bbigint\s*\(\s*\d+\s*\)\s+SERIAL',
        'BIGSERIAL',
        content,
        flags=re.IGNORECASE
    )
    # Pattern: int(11) NOT NULL SERIAL → SERIAL
    content = re.sub(
        r'\bint\s*\(\s*\d+\s*\)\s+NOT\s+NULL\s+SERIAL',
        'SERIAL',
        content,
        flags=re.IGNORECASE
    )
    return content

def fix_bit_type(content):
    """Convert bit(1) to BOOLEAN"""
    # Convert bit(1) DEFAULT b'0' → BOOLEAN DEFAULT FALSE
    content = re.sub(
        r"bit\s*\(\s*1\s*\)\s+(NOT\s+NULL\s+)?DEFAULT\s+b'0'",
        r"BOOLEAN \1DEFAULT FALSE",
        content,
        flags=re.IGNORECASE
    )
    # Convert bit(1) DEFAULT b'1' → BOOLEAN DEFAULT TRUE
    content = re.sub(
        r"bit\s*\(\s*1\s*\)\s+(NOT\s+NULL\s+)?DEFAULT\s+b'1'",
        r"BOOLEAN \1DEFAULT TRUE",
        content,
        flags=re.IGNORECASE
    )
    # Convert bit(1) DEFAULT NULL → BOOLEAN DEFAULT NULL
    content = re.sub(
        r"bit\s*\(\s*1\s*\)\s+DEFAULT\s+NULL",
        "BOOLEAN DEFAULT NULL",
        content,
        flags=re.IGNORECASE
    )
    # Convert bit(1) NOT NULL → BOOLEAN NOT NULL
    content = re.sub(
        r"bit\s*\(\s*1\s*\)\s+NOT\s+NULL",
        "BOOLEAN NOT NULL",
        content,
        flags=re.IGNORECASE
    )
    # Convert remaining bit(1) → BOOLEAN
    content = re.sub(
        r"bit\s*\(\s*1\s*\)",
        "BOOLEAN",
        content,
        flags=re.IGNORECASE
    )
    return content

def fix_integer_types(content):
    """Remove parentheses from integer type definitions"""
    # int(11) → INTEGER
    content = re.sub(
        r'\bint\s*\(\s*\d+\s*\)',
        'INTEGER',
        content,
        flags=re.IGNORECASE
    )
    # bigint(20) → BIGINT
    content = re.sub(
        r'\bbigint\s*\(\s*\d+\s*\)',
        'BIGINT',
        content,
        flags=re.IGNORECASE
    )
    # tinyint(1) → SMALLINT (only if not already converted to BOOLEAN)
    # This should be done after BIT conversion
    content = re.sub(
        r'\btinyint\s*\(\s*\d+\s*\)',
        'SMALLINT',
        content,
        flags=re.IGNORECASE
    )
    # smallint(5) → SMALLINT
    content = re.sub(
        r'\bsmallint\s*\(\s*\d+\s*\)',
        'SMALLINT',
        content,
        flags=re.IGNORECASE
    )
    return content

def quote_table_names_with_spaces(content):
    """Quote table names with spaces in DROP and CREATE statements"""
    # Fix DROP TABLE IF EXISTS table_name → DROP TABLE IF EXISTS "table_name"
    def quote_drop_table(match):
        table_name = match.group(1)
        if ' ' in table_name or not re.match(r'^[a-z_][a-z0-9_]*$', table_name, re.IGNORECASE):
            return f'DROP TABLE IF EXISTS "{table_name}";'
        return match.group(0)
    
    content = re.sub(
        r'DROP\s+TABLE\s+IF\s+EXISTS\s+([^;]+);',
        lambda m: f'DROP TABLE IF EXISTS "{m.group(1).strip()}";' if ' ' in m.group(1) or not re.match(r'^[a-z_][a-z0-9_]*$', m.group(1).strip(), re.IGNORECASE) else m.group(0),
        content,
        flags=re.IGNORECASE
    )
    return content

def add_missing_foreign_key_columns(content):
    """Add missing columns that are referenced in foreign keys but not defined"""
    
    lines = content.split('\n')
    fixed_lines = []
    i = 0
    current_table_start = -1
    table_columns = set()
    foreign_keys = []
    in_create_table = False
    
    while i < len(lines):
        line = lines[i]
        
        # Detect CREATE TABLE start
        if re.search(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:kulman\.)?', line, re.IGNORECASE):
            in_create_table = True
            current_table_start = len(fixed_lines)
            table_columns.clear()
            foreign_keys.clear()
        
        # Extract column names from table definition
        if in_create_table:
            # Match column definitions: column_name type
            # Pattern: column_name type or "column name" type
            column_match = re.match(r'^\s*"?([^"]+)"?\s+(\w+)', line.strip())
            if column_match and not line.strip().startswith('PRIMARY') and not line.strip().startswith('CONSTRAINT'):
                col_name = column_match.group(1).strip().strip('"')
                # Remove trailing comma if present
                col_name = col_name.rstrip(',')
                table_columns.add(col_name.lower())
        
        # Extract foreign key references
        fk_match = re.search(r'FOREIGN\s+KEY\s*\(([^)]+)\)', line, re.IGNORECASE)
        if fk_match:
            fk_column = fk_match.group(1).strip().strip('"')
            foreign_keys.append(fk_column.lower())
        
        # When we hit the closing of CREATE TABLE
        if in_create_table and line.strip() == ');':
            # Add missing foreign key columns before PRIMARY KEY or CONSTRAINT
            if foreign_keys:
                # Find where PRIMARY KEY or CONSTRAINT starts
                insert_position = None
                for j in range(len(fixed_lines) - 1, current_table_start - 1, -1):
                    if fixed_lines[j].strip().startswith('PRIMARY KEY') or fixed_lines[j].strip().startswith('CONSTRAINT'):
                        insert_position = j
                        break
                
                if insert_position is None:
                    # Find the last column definition
                    for j in range(len(fixed_lines) - 1, current_table_start - 1, -1):
                        if fixed_lines[j].strip() and not fixed_lines[j].strip().startswith('--'):
                            insert_position = j + 1
                            break
                
                if insert_position:
                    # Add missing columns
                    added_columns = []
                    for fk_col in foreign_keys:
                        # Check if column exists
                        if fk_col not in table_columns:
                            # Most FK columns are BIGINT references to id columns
                            indent = '  '  # Standard indent
                            # Use original case if we can find it
                            original_fk_col = fk_col
                            added_columns.append(f'{indent}{original_fk_col} BIGINT,')
                            table_columns.add(fk_col)
                    
                    # Insert missing columns
                    if added_columns:
                        for col in reversed(added_columns):
                            fixed_lines.insert(insert_position, col)
            
            in_create_table = False
            current_table_start = -1
        
        fixed_lines.append(line)
        i += 1
    
    return '\n'.join(fixed_lines)

def quote_column_names_with_spaces(content):
    """Quote column names that contain spaces"""
    lines = content.split('\n')
    fixed_lines = []
    
    for line in lines:
        # Only process lines inside CREATE TABLE statements
        # Match column definitions: column name type
        # Pattern: spaces or special chars indicate need for quotes
        if re.search(r'^\s+[A-Za-z][^"]+ [A-Za-z]', line) and not line.strip().startswith('--'):
            # Check if line is a column definition (has a type after column name)
            column_def_match = re.match(r'^(\s+)([^,]+?)\s+(\w+.*)', line)
            if column_def_match:
                indent = column_def_match.group(1)
                col_name_part = column_def_match.group(2).strip()
                type_part = column_def_match.group(3)
                
                # If column name has spaces or special chars, quote it
                if (' ' in col_name_part or not re.match(r'^[a-z_][a-z0-9_]*$', col_name_part, re.IGNORECASE)) and not col_name_part.startswith('"'):
                    # Already quoted, skip
                    if not col_name_part.startswith('"'):
                        col_name_part = f'"{col_name_part}"'
                    
                    line = f'{indent}{col_name_part} {type_part}'
        
        fixed_lines.append(line)
    
    return '\n'.join(fixed_lines)

def fix_schema_issues(content):
    """Apply all fixes"""
    print("Fixing SERIAL syntax...")
    content = fix_serial_syntax(content)
    
    print("Fixing BIT type conversions...")
    content = fix_bit_type(content)
    
    print("Fixing integer type syntax...")
    content = fix_integer_types(content)
    
    print("Quoting table names with spaces...")
    content = quote_table_names_with_spaces(content)
    
    print("Quoting column names with spaces...")
    content = quote_column_names_with_spaces(content)
    
    print("Adding missing foreign key columns...")
    content = add_missing_foreign_key_columns(content)
    
    return content

def main():
    input_file = 'kulman_schema_postgresql.sql'
    output_file = 'kulman_schema_postgresql_fixed.sql'
    
    print(f"Reading {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"Original file size: {len(content):,} characters")
    
    # Apply fixes
    fixed_content = fix_schema_issues(content)
    
    print(f"\nWriting fixed schema to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(fixed_content)
    
    print(f"✓ Fixed schema written to {output_file}")
    print(f"  Fixed file size: {len(fixed_content):,} characters")

if __name__ == '__main__':
    main()

