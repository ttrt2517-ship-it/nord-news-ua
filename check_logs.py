#!/usr/bin/env python3
"""
Check access logs for 403 errors
"""

import paramiko

HOST = "access-5019998868.webspace-host.com"
PORT = 22
USERNAME = "a843749"
PASSWORD = "ho1iu23687069786a9s@!#"

def run_command(ssh, command):
    stdin, stdout, stderr = ssh.exec_command(command)
    output = stdout.read().decode('utf-8')
    error = stderr.read().decode('utf-8')
    if output:
        print(output)
    if error:
        print(f"STDERR: {error}")
    return output, error

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(HOST, PORT, USERNAME, PASSWORD)
        print("Connected!\n")
        
        # Check access log for recent requests
        print("="*60)
        print("RECENT ACCESS LOG ENTRIES (last 30 lines):")
        print("="*60)
        run_command(ssh, "tail -30 logs/access.log.current")
        
        # Check for 403 errors specifically
        print("\n" + "="*60)
        print("403 ERRORS IN ACCESS LOG:")
        print("="*60)
        run_command(ssh, "grep ' 403 ' logs/access.log.current | tail -20")
        
        # Check the actual .htaccess content on server
        print("\n" + "="*60)
        print(".HTACCESS CONTENT ON SERVER:")
        print("="*60)
        run_command(ssh, "cat .htaccess")
        
        # Check permissions in numeric format
        print("\n" + "="*60)
        print("PERMISSIONS IN NUMERIC FORMAT:")
        print("="*60)
        run_command(ssh, "stat -c '%a %n' .")
        run_command(ssh, "stat -c '%a %n' index.html")
        run_command(ssh, "stat -c '%a %n' admin")
        run_command(ssh, "stat -c '%a %n' api")
        run_command(ssh, "stat -c '%a %n' css")
        run_command(ssh, "stat -c '%a %n' js")
        run_command(ssh, "stat -c '%a %n' data")
        
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
