#!/usr/bin/env python3
"""
Copy files to domain-specific directory for IONOS hosting.
"""

import paramiko

# Server connection details
HOST = "access-5019998868.webspace-host.com"
PORT = 22
USERNAME = "a843749"
PASSWORD = "ho1iu23687069786a9s@!#"

def run_command(ssh, command):
    """Execute a command on the remote server and return the output."""
    print(f"\n> {command}")
    stdin, stdout, stderr = ssh.exec_command(command)
    output = stdout.read().decode('utf-8')
    error = stderr.read().decode('utf-8')
    if output:
        print(output)
    if error:
        print(f"STDERR: {error}")
    return output, error

def main():
    print("="*60)
    print("Copy files to domain directory for IONOS hosting")
    print("="*60)
    
    # Create SSH client
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        # Connect to server
        print(f"\nConnecting to {HOST}...")
        ssh.connect(HOST, PORT, USERNAME, PASSWORD)
        print("Connected successfully!")
        
        # Check current structure
        print("\n" + "="*60)
        print("CURRENT STRUCTURE:")
        print("="*60)
        run_command(ssh, "ls -la")
        
        # Create domain directory if it doesn't exist
        print("\n" + "="*60)
        print("CREATING DOMAIN DIRECTORY:")
        print("="*60)
        run_command(ssh, "mkdir -p glf-bikube.info")
        
        # Copy all files to the domain directory
        print("\n" + "="*60)
        print("COPYING FILES:")
        print("="*60)
        run_command(ssh, "cp -r * glf-bikube.info/")
        
        # Set permissions
        print("\n" + "="*60)
        print("SETTING permissions:")
        print("="*60)
        run_command(ssh, "chmod R 755 glf-bikube.info")
        run_command(ssh, "chmod -R 755 glf-bikube.info/*")
        
        # Verify
        print("\n" + "="*60)
        print("VERIFICATION:")
        print("="*60)
        run_command(ssh, "ls -la glf-bikube.info/")
        
        print("\n" + "="*60)
        print("DONE! Please test: https://glf-bikube.info/")
        print("="*60)
        
    except Exception as e:
        print(f"ERROR: {e}")
        import sys
        sys.exit(1)
    finally:
        ssh.close()
        print("\nSSH connection closed.")
