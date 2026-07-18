# SSL Certificate Generation Script for Development
# Story 5.1: HTTPS and Secure Transport
# 
# This script generates self-signed SSL certificates for development/testing purposes
# For production, use proper CA-signed certificates

Write-Host "=== SSL Certificate Generation for Development ===" -ForegroundColor Cyan
Write-Host ""

# Create ssl directory if it doesn't exist
$sslDir = "$PSScriptRoot\ssl"
if (-not (Test-Path $sslDir)) {
    New-Item -ItemType Directory -Path $sslDir | Out-Null
    Write-Host "Created SSL directory: $sslDir" -ForegroundColor Green
}

# Check if OpenSSL is available
try {
    $opensslVersion = & openssl version 2>&1
    Write-Host "OpenSSL found: $opensslVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: OpenSSL not found. Please install OpenSSL first." -ForegroundColor Red
    Write-Host "Download from: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Generating self-signed SSL certificate..." -ForegroundColor Yellow

# Generate private key
$keyFile = "$sslDir\server.key"
$certFile = "$sslDir\server.crt"
$csrFile = "$sslDir\server.csr"

# Remove existing files
if (Test-Path $keyFile) { Remove-Item $keyFile }
if (Test-Path $certFile) { Remove-Item $certFile }
if (Test-Path $csrFile) { Remove-Item $csrFile }

# Create configuration file for OpenSSL
$configFile = "$sslDir\openssl.cnf"
@"
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
C=IN
ST=Karnataka
L=Bangalore
O=PESU MDP
OU=Development
CN=localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = 127.0.0.1
IP.1 = 127.0.0.1
"@ | Out-File -FilePath $configFile -Encoding UTF8

# Generate self-signed certificate
$opensslCmd = "openssl req -x509 -newkey rsa:2048 -keyout `"$keyFile`" -out `"$certFile`" -days 365 -nodes -config `"$configFile`""

try {
    Invoke-Expression $opensslCmd
    Write-Host ""
    Write-Host "SSL certificate generated successfully!" -ForegroundColor Green
    Write-Host "  Private Key: $keyFile" -ForegroundColor Cyan
    Write-Host "  Certificate: $certFile" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Note: This is a self-signed certificate for development only." -ForegroundColor Yellow
    Write-Host "For production, use a certificate from a trusted Certificate Authority." -ForegroundColor Yellow
    Write-Host ""
    
    # Clean up config file
    Remove-Item $configFile
    
} catch {
    Write-Host "ERROR: Failed to generate certificate" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Create .gitignore in ssl directory
@"
# Ignore SSL certificates and keys
*.key
*.crt
*.csr
*.pem
*.p12
*.pfx

# Keep this .gitignore file
!.gitignore
"@ | Out-File -FilePath "$sslDir\.gitignore" -Encoding UTF8

Write-Host "Created .gitignore to protect SSL files from version control" -ForegroundColor Green
Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
