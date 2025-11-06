import json
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('BlogPosts')

def lambda_handler(event, context):
    try:
        # Get post ID from URL
        post_id = event['pathParameters']['id']
        
        # Get post from database
        response = table.get_item(Key={'postId': post_id})
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Post not found'})
            }
        
        post = response['Item']
        
        # Increment view count
        table.update_item(
            Key={'postId': post_id},
            UpdateExpression='SET #views = #views + :inc',
            ExpressionAttributeNames={'#views': 'views'},
            ExpressionAttributeValues={':inc': 1}
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps(post)
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
