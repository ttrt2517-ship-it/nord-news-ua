#!/usr/bin/env python3
"""
Check domain configuration on IONOS hosting.
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
    print("Check Domain Configuration on IONOS Hosting")
    print("="*60)
    
    # Create SSH client
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        # Connect to server
        print(f"\nConnecting to {HOST}...")
        ssh.connect(HOST, PORT, USERNAME, PASSWORD)
        print("Connected successfully!")
        
        # Check the parent directory structure
        print("\n" + "="*60)
        print("CHECKING DIRECTORY STRUCTURE:")
        print("="*60)
        run_command(ssh, "ls -la /homepages/14/d4299721553/")
        
        # Check if there's a domain-specific directory
        print("\n" + "="*60)
        print("CHECKING FOR DOMAIN-SPECIFIC DIRECTORIES:")
        print("="*60)
        run_command(ssh, "find /homepages/14/d4299721553/ -maxdepth 2 -type d")
        
        # Check if there's a glf-bikube.info directory
        print("\n" + "="*60)
        print("CHECKING FOR GLF-BIKUBE.INFO DIRECTORY:")
        print("="*60)
        run_command(ssh, "ls -la /homepages/14/d4299721553/glf-bikube.info 2>/dev/null || echo 'Directory does not exist'")
        
        # Check the current htdocs directory
        print("\n" + "="*60)
        print("CHECKING HTDOCS DIRECTORY:")
        print("="*60)
        run_command(ssh, "ls -la /homepages/14/d4299721553/htdocs/")
        
        # Check if there's a symlink or alias for the domain
        print("\n" + "="*60)
        print("CHECKING FOR SYMLINKS:")
        print("="*60)
        run_command(ssh, "find /homepages/14/d4299721553/ -type l -ls")
        
        print("\n" + "="*60)
        print("DONE!")
        print("="*60)
        
    except Exception as e:
        print(f"ERROR: {e}")
        import sys
        sys.exit(1)
    finally:
        ssh.close()
        print("\nSSH connection closed.")

if __name__ == "__main__":
    main()
