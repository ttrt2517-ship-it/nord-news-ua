#!/usr/bin/env python3
"""
SSH Diagnostic Script for 403 Forbidden Error
This script connects to the web server and runs diagnostics to find the cause of 403 error.
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
    print(f"\n{'='*60}")
    print(f"COMMAND: {command}")
    print('='*60)
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
    print("SSH Diagnostic Script for 403 Forbidden Error")
    print("="*60)
    
    # Create SSH client
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        # Connect to server
        print(f"\nConnecting to {HOST}...")
        ssh.connect(HOST, PORT, USERNAME, PASSWORD)
        print("Connected successfully!")
        
        # 1. Find home directory and web root
        print("\n" + "="*60)
        print("STEP 1: Finding home directory and web root")
        print("="*60)
        run_command(ssh, "pwd")
        run_command(ssh, "ls -la")
        
        # 2. Check common web directories
        print("\n" + "="*60)
        print("STEP 2: Checking common web directories")
        print("="*60)
        run_command(ssh, "ls -la public_html 2>/dev/null || echo 'public_html not found'")
        run_command(ssh, "ls -la www 2>/dev/null || echo 'www not found'")
        run_command(ssh, "ls -la htdocs 2>/dev/null || echo 'htdocs not found'")
        run_command(ssh, "ls -la public_ftp 2>/dev/null || echo 'public_ftp not found'")
        
        # 3. Check for index files in public_html
        print("\n" + "="*60)
        print("STEP 3: Checking for index files")
        print("="*60)
        run_command(ssh, "ls -la public_html/index.* 2>/dev/null || echo 'No index files found in public_html'")
        run_command(ssh, "find . -name 'index.html' -o -name 'index.php' 2>/dev/null | head -20")
        
        # 4. Check .htaccess file
        print("\n" + "="*60)
        print("STEP 4: Checking .htaccess files")
        print("="*60)
        run_command(ssh, "cat public_html/.htaccess 2>/dev/null || echo 'No .htaccess in public_html'")
        run_command(ssh, "find . -name '.htaccess' 2>/dev/null")
        
        # 5. Check file permissions
        print("\n" + "="*60)
        print("STEP 5: Checking file permissions in detail")
        print("="*60)
        run_command(ssh, "stat public_html 2>/dev/null || echo 'Cannot stat public_html'")
        run_command(ssh, "stat public_html/index.* 2>/dev/null || echo 'Cannot stat index files'")
        
        # 6. Check error logs
        print("\n" + "="*60)
        print("STEP 6: Checking error logs")
        print("="*60)
        run_command(ssh, "ls -la logs/ 2>/dev/null || echo 'No logs directory'")
        run_command(ssh, "ls -la error_logs/ 2>/dev/null || echo 'No error_logs directory'")
        run_command(ssh, "find . -name 'error_log' -o -name 'error.log' 2>/dev/null | head -10")
        run_command(ssh, "tail -50 logs/error_log 2>/dev/null || echo 'No error log in logs/'")
        run_command(ssh, "tail -50 public_html/error_log 2>/dev/null || echo 'No error log in public_html'")
        
        # 7. Check user and group
        print("\n" + "="*60)
        print("STEP 7: Checking user and group information")
        print("="*60)
        run_command(ssh, "id")
        run_command(ssh, "groups")
        
        # 8. Check disk space
        print("\n" + "="*60)
        print("STEP 8: Checking disk space")
        print("="*60)
        run_command(ssh, "df -h .")
        
        # 9. Check for any configuration files
        print("\n" + "="*60)
        print("STEP 9: Checking for configuration files")
        print("="*60)
        run_command(ssh, "ls -la *.conf 2>/dev/null || echo 'No .conf files in home'")
        run_command(ssh, "cat .htpasswd 2>/dev/null || echo 'No .htpasswd file'")
        
        # 10. Check the domain directory if exists
        print("\n" + "="*60)
        print("STEP 10: Checking for domain-specific directories")
        print("="*60)
        run_command(ssh, "ls -la glf-bikube.info 2>/dev/null || echo 'No glf-bikube.info directory'")
        run_command(ssh, "find . -type d -name '*glf*' 2>/dev/null")
        run_command(ssh, "find . -type d -name '*bikube*' 2>/dev/null")
        
        print("\n" + "="*60)
        print("DIAGNOSTIC COMPLETE")
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
