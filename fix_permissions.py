#!/usr/bin/env python3
"""
Fix Permissions Script for 403 Forbidden Error
This script fixes directory and file permissions to allow web server access.
"""

import paramiko
import sys

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
    print("Fix Permissions Script for 403 Forbidden Error")
    print("="*60)
    print("\nDIAGNOSIS: Group permissions are 0 (no access)")
    print("The web server likely runs under 'ftpusers' group.")
    print("This script will fix permissions to allow group access.")
    print("="*60)
    
    # Create SSH client
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        # Connect to server
        print(f"\nConnecting to {HOST}...")
        ssh.connect(HOST, PORT, USERNAME, PASSWORD)
        print("Connected successfully!")
        
        # Show current permissions
        print("\n" + "="*60)
        print("CURRENT PERMISSIONS:")
        print("="*60)
        run_command(ssh, "ls -la")
        
        # Fix directory permissions (set to 755 - rwxr-xr-x)
        print("\n" + "="*60)
        print("FIXING DIRECTORY PERMISSIONS (755):")
        print("="*60)
        run_command(ssh, "chmod 755 .")
        run_command(ssh, "chmod 755 admin api css js data new")
        
        # Fix file permissions (set to 644 - rw-r--r--)
        print("\n" + "="*60)
        print("FIXING FILE PERMISSIONS (644):")
        print("="*60)
        run_command(ssh, "chmod 644 index.html 404.html .htaccess DEPLOY-GUIDE.md")
        run_command(ssh, "chmod 644 admin/*.php api/*.php css/*.css js/*.js data/*.json")
        
        # Verify new permissions
        print("\n" + "="*60)
        print("NEW PERMISSIONS:")
        print("="*60)
        run_command(ssh, "ls -la")
        run_command(ssh, "stat -c '%a %n' . admin api css js data")
        
        print("\n" + "="*60)
        print("PERMISSIONS FIXED!")
        print("Please test the website: https://glf-bikube.info/")
        print("="*60)
        
    except paramiko.AuthenticationException:
        print("ERROR: Authentication failed. Please check your credentials.")
        sys.exit(1)
    except paramiko.SSHException as e:
        print(f"ERROR: SSH connection failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)
    finally:
        ssh.close()
        print("\nSSH connection closed.")

if __name__ == "__main__":
    main()
