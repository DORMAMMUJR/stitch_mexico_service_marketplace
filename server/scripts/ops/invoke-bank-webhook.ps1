param(
  [Parameter(Mandatory = $true)]
  [string]$Url,
  [Parameter(Mandatory = $true)]
  [string]$Secret,
  [Parameter(Mandatory = $true)]
  [string]$BodyFile,
  [switch]$InvalidSignature
)

if (!(Test-Path $BodyFile)) {
  throw "Body file not found: $BodyFile"
}

$body = Get-Content -Path $BodyFile -Raw
$keyBytes = [System.Text.Encoding]::UTF8.GetBytes($Secret)
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
$hmac = New-Object System.Security.Cryptography.HMACSHA256($keyBytes)
$hashBytes = $hmac.ComputeHash($bodyBytes)
$signature = ([BitConverter]::ToString($hashBytes)).Replace('-', '').ToLower()

if ($InvalidSignature) {
  $signature = 'deadbeef' + $signature.Substring(8)
}

$headers = @{
  'x-webhook-signature' = $signature
  'Content-Type' = 'application/json'
}

Write-Host "POST $Url"
Write-Host "Signature: $signature"

try {
  $response = Invoke-RestMethod -Uri $Url -Method POST -Headers $headers -Body $body
  $response | ConvertTo-Json -Depth 10
} catch {
  if ($_.Exception.Response -and $_.Exception.Response.GetResponseStream()) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.BaseStream.Position = 0
    $reader.DiscardBufferedData()
    $errorBody = $reader.ReadToEnd()
    Write-Host "Request failed:" $_.Exception.Message
    Write-Host $errorBody
  } else {
    throw
  }
}
