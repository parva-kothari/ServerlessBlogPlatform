import json
import boto3
import uuid
from datetime import datetime
from decimal import Decimal

dynamodb = boto3.resource('dynamodb', region_name='ap-south-1')
table = dynamodb.Table('BlogPosts')

def lambda_handler(event, context):
    # Handle OPTIONS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,DELETE'
            },
            'body': ''
        }
    
    try:
        # Get userId from Authorization header (JWT token)
        # For now, we'll get it from the request body
        body = json.loads(event['body'])
        
        # Create new post with userId
        post = {
            'postId': str(uuid.uuid4()),
            'title': body['title'],
            'author': body['author'],
            'content': body['content'],
            'imageUrl': body.get('imageUrl', ''),
            'userId': body['userId'],  # Now includes userId
            'createdAt': datetime.now().isoformat(),
            'views': 0
        }
        
        # Save to database
        table.put_item(Item=post)
        
        def decimal_default(obj):
            if isinstance(obj, Decimal):
                return float(obj)
            raise TypeError
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,DELETE',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'message': 'Post created successfully',
                'post': post
            }, default=decimal_default)
        }
    except Exception as e:
        print(f"Create Post Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'error': str(e)})
        }

