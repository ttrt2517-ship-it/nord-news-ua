#!/usr/bin/env python3
"""
Fix domain subdirectory for IONOS hosting.
The domain glf-bikube.info is configured to look at a subdirectory,htdocs/glf-bikube.info/
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
    print("Fix Domain Subdirectory for IONOS Hosting")
    print("="*60)
    print("\nISSUE: Domain glf-bikube.info is configured to look at a subdirectory.")
    print("The subdirectory htdocs/glf-bikube.info/ has wrong permissions.")
    print("This script will copy files to the domain subdirectory and fix permissions.")
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
        
        # Fix permissions on the domain subdirectory
        print("\n" + "="*60)
        print("FIXING DOMAIN SUBDIRECTORY PERMISSIONS:")
        print("="*60)
        run_command(ssh, "chmod 755 glf-bikube.info")
        
        # Copy all files to the domain subdirectory
        print("\n" + "="*60)
        print("COPYING FILES TO DOMAIN SUBDIRECTORY:")
        print("="*60)
        # Copy all files except the domain subdirectory itself
        run_command(ssh, "cp -r index.html 404.html .htaccess DEPLOY-GUIDE.md robots.txt sitemap.xml sitemap.php manifest.json logo.svg article.php glf-bikube.info/")
        run_command(ssh, "cp -r admin glf-bikube.info/")
        run_command(ssh, "cp -r api glf-bikube.info/")
        run_command(ssh, "cp -r css glf-bikube.info/")
        run_command(ssh, "cp -r js glf-bikube.info/")
        run_command(ssh, "cp -r data glf-bikube.info/")
        
        # Set permissions on the domain subdirectory
        print("\n" + "="*60)
        print("SETTING PERMISSIONS:")
        print("="*60)
        run_command(ssh, "chmod -R 755 glf-bikube.info")
        run_command(ssh, "chmod -R 644 glf-bikube.info/*.html glf-bikube.info/*.php glf-bikube.info/*.md glf-bikube.info/*.txt glf-bikube.info/*.xml glf-bikube.info/*.json glf-bikube.info/*.svg glf-bikube.info/.htaccess")
        run_command(ssh, "chmod 755 glf-bikube.info/admin glf-bikube.info/api glf-bikube.info/css glf-bikube.info/js glf-bikube.info/data")
        
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

if __name__ == "__main__":
    main()
