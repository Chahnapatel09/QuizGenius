#!/bin/bash

# Navigate to the terraform directory relative to the script location
cd "$(dirname "$0")/terraform" || exit 1


# 1. Verify AWS Credentials
echo "Checking AWS Credentials..."
if ! aws sts get-caller-identity --query "Account" --output text > /dev/null 2>&1; then
    echo "ERROR: Your AWS Credentials ($HOME/.aws/credentials) are INVALID or EXPIRED."
    echo "Please update credentials and try again."
    exit 1
fi
echo "Credentials verified."

# 2. Run terraform apply to ensure infrastructure is up and running
echo "Synchronizing with AWS..."
terraform apply -auto-approve

# Retrieve the public website URL from terraform outputs
WEBSITE_URL=$(terraform output -raw website_url)

if [ -n "$WEBSITE_URL" ] && [ "$WEBSITE_URL" != "null" ]; then

    echo "SUCCESS: Your website is live at $WEBSITE_URL"

    
    # Open the URL in the default browser (macOS command)
    open "$WEBSITE_URL"
else

    echo "ERROR: Could not retrieve the website URL."
    echo "Please check if 'terraform apply' succeeded."
    exit 1
fi
