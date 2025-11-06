#!/usr/bin/env python3
"""
Fix foreign key order issues in PostgreSQL schema
Removes foreign key constraints from CREATE TABLE and adds them separately at the end
"""

import re
import sys
import argparse

def fix_foreign_key_order(sql_content):
    """
    Extract foreign key constraints from CREATE TABLE statements
    and add them separately at the end after all tables are created
    """
    lines = sql_content.split('\n')
    create_table_blocks = []
    foreign_key_constraints = []
    current_table = None
    current_table_lines = []
    in_create_table = False
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Detect CREATE TABLE start
        create_match = re.search(r'CREATE TABLE IF NOT EXISTS\s+([\w"\.]+)', line, re.IGNORECASE)
        if create_match:
            if current_table:
                # Save previous table
                create_table_blocks.append((current_table, current_table_lines))
            
            current_table = create_match.group(1)
            current_table_lines = [line]
            in_create_table = True
            i += 1
            continue
        
        if in_create_table:
            current_table_lines.append(line)
            
            # Check if line has foreign key constraint
            fk_match = re.search(r'CONSTRAINT\s+(\w+)\s+FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([\w"\.]+)\s*\(([^)]+)\)', line, re.IGNORECASE)
            if fk_match:
                constraint_name = fk_match.group(1)
                fk_columns = fk_match.group(2)
                ref_table = fk_match.group(3)
                ref_columns = fk_match.group(4)
                
                # Store the FK constraint to add later
                fk_sql = f'ALTER TABLE {current_table} ADD CONSTRAINT {constraint_name} FOREIGN KEY ({fk_columns}) REFERENCES {ref_table} ({ref_columns});'
                foreign_key_constraints.append(fk_sql)
                
                # Remove the constraint line from CREATE TABLE
                # Just skip adding this line to current_table_lines
                i += 1
                continue
            
            # Check if table ends
            if line.strip() == ');' or line.strip() == ')':
                in_create_table = False
                create_table_blocks.append((current_table, current_table_lines))
                current_table = None
                current_table_lines = []
        
        i += 1
    
    # Rebuild SQL
    output_lines = []
    
    # Add schema creation
    if sql_content.startswith('CREATE SCHEMA'):
        # Extract header (schema creation, comments, etc.)
        header_lines = []
        for line in lines:
            if re.match(r'^CREATE SCHEMA|^SET search_path', line, re.IGNORECASE):
                header_lines.append(line)
            elif line.strip().startswith('--') and not any('Table structure' in l for l in lines[lines.index(line):]):
                header_lines.append(line)
            else:
                break
        output_lines.extend(header_lines)
        output_lines.append('')
    
    # Add all CREATE TABLE statements (without foreign keys)
    for table_name, table_lines in create_table_blocks:
        # Remove foreign key constraint lines from table definition
        cleaned_lines = []
        for line in table_lines:
            if 'FOREIGN KEY' in line or 'REFERENCES' in line:
                # Remove this line (FK constraint)
                continue
            cleaned_lines.append(line)
        
        # Join and add to output
        output_lines.extend(cleaned_lines)
        output_lines.append('')
    
    # Add all ALTER TABLE statements for foreign keys at the end
    if foreign_key_constraints:
        output_lines.append('')
        output_lines.append('-- Add Foreign Key Constraints')
        output_lines.append('-- Foreign keys are added after all tables are created')
        output_lines.append('')
        output_lines.extend(foreign_key_constraints)
    
    return '\n'.join(output_lines)

def main():
    parser = argparse.ArgumentParser(
        description='Fix foreign key order issues - remove FKs from CREATE TABLE and add separately'
    )
    parser.add_argument('input_file', help='Input SQL schema file')
    parser.add_argument('-o', '--output', help='Output fixed SQL file')
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
    
    # Fix foreign key order
    if args.verbose:
        print("Extracting foreign key constraints...")
    
    fixed_content = fix_foreign_key_order(sql_content)
    
    # Determine output file
    if args.output:
        output_file = args.output
    else:
        if args.input_file.endswith('.sql'):
            output_file = args.input_file.replace('.sql', '_ordered.sql')
        else:
            output_file = args.input_file + '_ordered.sql'
    
    # Write output
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        
        import os
        input_size = os.path.getsize(args.input_file)
        output_size = os.path.getsize(output_file)
        
        print(f"\n[OK] Foreign key ordering fixed!")
        print(f"  Input:  {args.input_file} ({input_size:,} bytes)")
        print(f"  Output: {output_file} ({output_size:,} bytes)")
        print(f"\n  Foreign key constraints have been moved to the end")
        print(f"  All tables will be created first, then FKs added")
        
    except Exception as e:
        print(f"Error writing output file: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()



