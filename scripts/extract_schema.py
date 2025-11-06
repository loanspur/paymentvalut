#!/usr/bin/env python3
"""
Extract Schema from SQL Dump
Removes all data (INSERT statements) and keeps only the database structure (DDL)
"""

import re
import sys
import argparse

def extract_schema(sql_content, verbose=False):
    """
    Extract schema (DDL) from SQL dump, removing all data (INSERT statements)
    """
    lines = sql_content.split('\n')
    schema_lines = []
    in_insert_statement = False
    in_comment_block = False
    
    if verbose:
        print("Extracting schema from SQL dump...")
    
    skip_patterns = [
        r'^INSERT\s+INTO',          # INSERT INTO statements
        r'^LOCK\s+TABLES',          # LOCK TABLES
        r'^UNLOCK\s+TABLES',        # UNLOCK TABLES
        r'^/\*!\d+.*?\*/',          # MySQL version-specific comments
        r'^SET\s+@OLD_',            # MySQL session variables
        r'^SET\s+CHARACTER_SET',    # Character set settings
        r'^SET\s+NAMES',            # SET NAMES
        r'^SET\s+SQL_MODE',         # SQL mode settings
        r'^SET\s+@',                # Other session variables
        r'^/\*!\d+.*INSERT',        # MySQL versioned INSERT statements
    ]
    
    keep_patterns = [
        r'^CREATE\s+',              # CREATE statements
        r'^ALTER\s+',               # ALTER statements
        r'^DROP\s+',                # DROP statements
        r'^USE\s+',                 # USE database
        r'^/\*',                    # Comment blocks (for documentation)
        r'^\s*\*',                  # Comment continuation
        r'^--',                     # SQL comments
        r'^SET\s+foreign_key_checks', # Foreign key settings (important for schema)
        r'^SET\s+FOREIGN_KEY_CHECKS',
        r'^\s*$',                   # Empty lines
        r'^\s*;',                   # Statement terminators
    ]
    
    insert_block_pattern = re.compile(r'INSERT\s+INTO.*?VALUES\s*\(', re.IGNORECASE | re.DOTALL)
    
    skip_count = 0
    keep_count = 0
    
    i = 0
    while i < len(lines):
        line = lines[i]
        original_line = line
        stripped = line.strip()
        
        # Skip empty lines at the end, keep them in the middle
        if not stripped and not schema_lines:
            i += 1
            continue
        
        # Check if line should be skipped
        should_skip = False
        for pattern in skip_patterns:
            if re.match(pattern, stripped, re.IGNORECASE):
                should_skip = True
                skip_count += 1
                break
        
        if should_skip:
            # If it's an INSERT statement, skip until we find the semicolon or next statement
            if re.match(r'^INSERT\s+INTO', stripped, re.IGNORECASE):
                # Skip multi-line INSERT statements
                while i < len(lines) and not lines[i].strip().endswith(';'):
                    i += 1
                # Skip the line with semicolon too
                i += 1
                continue
            i += 1
            continue
        
        # Check if line should be kept
        should_keep = False
        for pattern in keep_patterns:
            if re.match(pattern, stripped, re.IGNORECASE):
                should_keep = True
                keep_count += 1
                break
        
        # Keep DDL statements and comments
        if should_keep or any(keyword in stripped.upper() for keyword in [
            'CREATE', 'ALTER', 'DROP', 'INDEX', 'CONSTRAINT', 'PRIMARY KEY',
            'FOREIGN KEY', 'UNIQUE', 'COMMENT', 'ENGINE', 'CHARSET',
            'DEFAULT', 'AUTO_INCREMENT', '--', '/*'
        ]):
            schema_lines.append(line)
        elif not stripped:
            # Keep empty lines for readability
            schema_lines.append(line)
        
        i += 1
    
    schema_content = '\n'.join(schema_lines)
    
    # Clean up: Remove consecutive empty lines (more than 2)
    schema_content = re.sub(r'\n{3,}', '\n\n', schema_content)
    
    # Clean up: Remove MySQL-specific versioned comments
    schema_content = re.sub(r'/\*!\d+[^*]*\*+(?:[^*/][^*]*\*+)*/', '', schema_content)
    
    if verbose:
        print(f"  Skipped {skip_count} data lines")
        print(f"  Kept {keep_count} schema lines")
        print("  Schema extraction complete!")
    
    return schema_content

def main():
    parser = argparse.ArgumentParser(
        description='Extract schema (structure only) from SQL dump file, removing all data'
    )
    parser.add_argument('input_file', help='Input SQL dump file (with data)')
    parser.add_argument('-o', '--output', help='Output schema-only SQL file')
    parser.add_argument('-v', '--verbose', action='store_true', help='Verbose output')
    parser.add_argument('--clean', action='store_true', help='Remove MySQL-specific comments and settings')
    
    args = parser.parse_args()
    
    # Read input file
    try:
        encoding = 'utf-8'
        try:
            with open(args.input_file, 'r', encoding='utf-8') as f:
                sql_content = f.read()
        except UnicodeDecodeError:
            # Try with latin-1 if utf-8 fails
            with open(args.input_file, 'r', encoding='latin-1') as f:
                sql_content = f.read()
                encoding = 'latin-1'
        
        if args.verbose:
            print(f"Read {len(sql_content)} characters from {args.input_file}")
            print(f"Using encoding: {encoding}")
            
    except FileNotFoundError:
        print(f"Error: File '{args.input_file}' not found")
        sys.exit(1)
    except Exception as e:
        print(f"Error reading file: {e}")
        sys.exit(1)
    
    # Extract schema
    schema_content = extract_schema(sql_content, args.verbose)
    
    if args.clean:
        if args.verbose:
            print("Cleaning MySQL-specific statements...")
        # Remove MySQL-specific SET statements
        schema_content = re.sub(r'SET\s+@OLD[^;]*;', '', schema_content, flags=re.IGNORECASE | re.MULTILINE)
        schema_content = re.sub(r'SET\s+CHARACTER_SET[^;]*;', '', schema_content, flags=re.IGNORECASE | re.MULTILINE)
        schema_content = re.sub(r'SET\s+NAMES[^;]*;', '', schema_content, flags=re.IGNORECASE | re.MULTILINE)
    
    # Determine output file
    if args.output:
        output_file = args.output
    else:
        # Generate output filename
        if args.input_file.endswith('.sql'):
            output_file = args.input_file.replace('.sql', '_schema_only.sql')
        elif args.input_file.endswith('.sql.zip') or args.input_file.endswith('.zip'):
            output_file = args.input_file.replace('.zip', '').replace('.sql', '_schema_only.sql')
        else:
            output_file = args.input_file + '_schema_only.sql'
    
    # Write output
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(schema_content)
        
        # Get file sizes
        import os
        input_size = os.path.getsize(args.input_file)
        output_size = os.path.getsize(output_file)
        size_reduction = (1 - output_size / input_size) * 100 if input_size > 0 else 0
        
        print(f"\n✓ Schema extraction complete!")
        print(f"  Input:  {args.input_file} ({input_size:,} bytes)")
        print(f"  Output: {output_file} ({output_size:,} bytes)")
        print(f"  Size reduction: {size_reduction:.1f}%")
        print(f"\n  The output file contains only the database structure (DDL)")
        print(f"  All INSERT statements and data have been removed.")
        
    except Exception as e:
        print(f"Error writing output file: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()

