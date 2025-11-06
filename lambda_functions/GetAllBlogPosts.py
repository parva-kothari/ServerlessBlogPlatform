import json
import boto3
from decimal import Decimal

# Explicitly set region
dynamodb = boto3.resource('dynamodb', region_name='ap-south-1')
table = dynamodb.Table('BlogPosts')

def lambda_handler(event, context):
    try:
        # Get all posts from database
        response = table.scan()
        posts = response.get('Items', [])
        
        # Sort by date (newest first)
        posts.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
        
        # Convert Decimal to float for JSON serialization
        def decimal_default(obj):
            if isinstance(obj, Decimal):
                return float(obj)
            raise TypeError
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,DELETE',
                'Content-Type': 'application/json'
            },
            'body': json.dumps(posts, default=decimal_default)
        }
    except Exception as e:
        print(f"Error: {str(e)}")  # Log to CloudWatch
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'error': str(e), 'items': []})
        }
