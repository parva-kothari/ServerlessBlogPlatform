import json
import boto3

dynamodb = boto3.resource('dynamodb', region_name='ap-south-1')
table = dynamodb.Table('BlogPosts')

def lambda_handler(event, context):
    try:
        # Get post ID from URL
        post_id = event['pathParameters']['id']
        
        # Get the post to check ownership
        response = table.get_item(Key={'postId': post_id})
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'error': 'Post not found'})
            }
        
        post = response['Item']
        
        # For now, we trust the frontend to only show delete button for own posts
        # In production, you'd verify JWT token here
        
        # Delete from database
        table.delete_item(Key={'postId': post_id})
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,DELETE',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'message': 'Post deleted successfully'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'error': str(e)})
        }
