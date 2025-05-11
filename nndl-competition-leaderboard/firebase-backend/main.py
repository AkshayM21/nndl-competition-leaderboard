# The Cloud Functions for Firebase SDK to create Cloud Functions and set up triggers.
from firebase_functions import https_fn, options, logger
from firebase_admin import initialize_app, credentials, db, storage, auth
import os
import tempfile
import pandas as pd
import torch
import json
import urllib.parse
import urllib.request
from datetime import datetime
from functools import wraps
from dotenv import load_dotenv

load_dotenv()

# Get admin email from environment variables
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL')

# Initialize Firebase Admin
# Get Firebase credentials from environment or file
if 'FIREBASE_CREDENTIALS' in os.environ:
    # For production: Use environment variable with JSON content
    cred_dict = json.loads(os.environ.get('FIREBASE_CREDENTIALS'))
    cred = credentials.Certificate(cred_dict)
else:
    # For development: Use local credentials file
    cred = credentials.Certificate("firebase-credentials.json")

# Initialize the app with appropriate configuration
app = initialize_app(cred, {
    'databaseURL': os.environ.get('APP_FIREBASE_DATABASE_URL'),
    'storageBucket': os.environ.get('APP_FIREBASE_STORAGE_BUCKET')
})

cors_options = options.CorsOptions(
    cors_origins=[r"https://nndl-course-leaderboard\.web\.app"],  # Specify your frontend domain
    cors_methods=["GET", "POST", "OPTIONS"],  # Include OPTIONS for preflight requests
)

options.set_global_options(
    region="us-central1",  # Set the region for your functions
   # cors=cors_options
)

# Load the ground truth data
global ground_truth
ground_truth = None
# GROUND_TRUTH_PATH = os.environ.get('GROUND_TRUTH_PATH', 'test_data.csv')

# # Load ground truth data when the function is first initialized
# test_predictions = pd.read_csv(GROUND_TRUTH_PATH)
# ground_truth = list(zip(test_predictions['superclass_index'], test_predictions['subclass_index']))

# Helper function to verify Firebase ID token
def verify_token(token):
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        return None

# Authentication middleware for Firebase Functions
def auth_required(func):
    @wraps(func)
    def decorated_function(req: https_fn.Request) -> https_fn.Response:
        auth_header = req.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return https_fn.Response(json.dumps({'error': 'No token provided'}), status=401)
        
        token = auth_header.split('Bearer ')[1]
        decoded_token = verify_token(token)
        
        if not decoded_token:
            return https_fn.Response(json.dumps({'error': 'Invalid token'}), status=401)
        
        # Check if email ends with columbia.edu or barnard.edu
        email = decoded_token.get('email', '')
        if not (email.endswith('@columbia.edu') or email.endswith('@barnard.edu')):
            return https_fn.Response(json.dumps({'error': 'Unauthorized domain'}), status=403)
        
        # Add user info to request context
        req.user = {
            'uid': decoded_token.get('uid'),
            'email': email
        }
        
        return func(req)
    return decorated_function

# Function to evaluate model predictions
def evaluate_predictions(preds, ground_truth):
    try:
        # Initialize counters
        super_correct = 0
        sub_correct = 0
        seen_super_correct = 0
        seen_sub_correct = 0
        unseen_super_correct = 0
        unseen_sub_correct = 0
        total = 0
        seen_super_total = 0
        seen_sub_total = 0
        unseen_super_total = 0
        unseen_sub_total = 0
        
        # Calculate metrics
        for i, (gt, pred) in enumerate(zip(ground_truth, preds)):
            super_gt, sub_gt = gt
            super_pred, sub_pred = pred
            
            if super_pred == super_gt:
                super_correct += 1
            if sub_pred == sub_gt:
                sub_correct += 1
            total += 1
            
            # Unseen superclass setting
            if super_gt == 3:
                if super_pred == super_gt:
                    unseen_super_correct += 1
                if sub_pred == sub_gt:
                    unseen_sub_correct += 1
                unseen_super_total += 1
                unseen_sub_total += 1
            
            # Seen superclass, unseen subclass setting
            elif sub_gt == 87:
                if super_pred == super_gt:
                    seen_super_correct += 1
                if sub_pred == sub_gt:
                    unseen_sub_correct += 1
                seen_super_total += 1
                unseen_sub_total += 1
            
            # Seen superclass and subclass setting
            else:
                if super_pred == super_gt:
                    seen_super_correct += 1
                if sub_pred == sub_gt:
                    seen_sub_correct += 1
                seen_super_total += 1
                seen_sub_total += 1
        
        # Avoid division by zero
        metrics = {
            'superAccuracy': super_correct / total if total > 0 else 0,
            'seenSuperAccuracy': seen_super_correct / seen_super_total if seen_super_total > 0 else 0,
            'unseenSuperAccuracy': unseen_super_correct / unseen_super_total if unseen_super_total > 0 else 0,
            'subAccuracy': sub_correct / total if total > 0 else 0,
            'seenSubAccuracy': seen_sub_correct / seen_sub_total if seen_sub_total > 0 else 0,
            'unseenSubAccuracy': unseen_sub_correct / unseen_sub_total if unseen_sub_total > 0 else 0
        }
        
        return metrics
    
    except Exception as e:
        logger.error(f"Error evaluating predictions: {e}")
        raise

# Firebase Cloud Functions

@https_fn.on_request(memory=options.MemoryOption.GB_1, cors=options.CorsOptions(
    cors_origins=[r"https://nndl-course-leaderboard\.web\.app"],  # Specify your frontend domain
    cors_methods=["GET", "POST", "OPTIONS"],  # Include OPTIONS for preflight requests
)
)
@auth_required
def evaluatesubmission(req: https_fn.Request) -> https_fn.Response:
    """Evaluate model predictions and save results to Firebase Realtime Database."""
    try:
        # Check if the request method is POST
        if req.method != 'POST':
            return https_fn.Response(json.dumps({'error': 'Method not allowed'}), status=405)
        
        data = req.get_json()
        file_url = data.get('fileUrl')
        team_name = data.get('teamName')
        model_name = data.get('modelName')
        description = data.get('description')
        email = data.get('email')
        
        # Validate input
        if not all([file_url, team_name, model_name, email]):
            return https_fn.Response(json.dumps({'error': 'Missing required fields'}), status=400)
        
        # Check if team_name is "Baseline" and if user is authorized
        if team_name == "Baseline" and email != ADMIN_EMAIL:
            return https_fn.Response(json.dumps({'error': 'Unauthorized to use the Baseline team name'}), status=403)
        
        # Extract the path from Firebase Storage URL
        # Format: https://firebasestorage.googleapis.com/v0/b/BUCKET_NAME/o/PATH?alt=media&token=TOKEN
        parsed_url = urllib.parse.urlparse(file_url)
        query_params = urllib.parse.parse_qs(parsed_url.query)
        
        # Get the path which is URL encoded in the path after /o/
        path = parsed_url.path.split('/o/')[1]
        path = urllib.parse.unquote(path)
        
        # Download the file
        bucket = storage.bucket()
        blob = bucket.blob(path)
        
        # Create a temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.csv')
        blob.download_to_filename(temp_file.name)


        # # Download CSV from storage
        # bucket = storage.bucket()
        # blob = bucket.blob(file_url.split('/', 3)[3])  # Extract the path after storage bucket
        
        # # Create a temporary file to store the CSV
        # temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.csv')
        # blob.download_to_filename(temp_file.name)

        predictions_csv = pd.read_csv(temp_file.name)
        logger.log(predictions_csv.head().to_string())
        predictions = list(zip(predictions_csv['superclass_index'], predictions_csv['subclass_index']))

        # Clean up temp file
        os.unlink(temp_file.name)
        
        blob = bucket.blob("test_data.csv")  # Extract the path after storage bucket
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.csv')
        blob.download_to_filename(temp_file.name)
        test_predictions = pd.read_csv(temp_file.name)
        os.unlink(temp_file.name)
        logger.log(test_predictions.head().to_string())
        ground_truth = list(zip(test_predictions['superclass_index'], test_predictions['subclass_index']))


        # Evaluate predictions
        metrics = evaluate_predictions(predictions, ground_truth)
        
        # Save results to Firebase Realtime Database
        submission_data = {
            'teamName': team_name,
            'modelName': model_name,
            'description': description,
            'email': email,
            'fileUrl': file_url,
            'metrics': metrics,
            'submissionTime': datetime.now().isoformat()
        }
        
        # Push to database
        submissions_ref = db.reference('submissions')
        new_submission_ref = submissions_ref.push(submission_data)
        
        return https_fn.Response(
            json.dumps({
                'success': True,
                'metrics': metrics,
                'submissionId': new_submission_ref.key
            }),
            status=200,
            content_type="application/json"
        )
    
    except Exception as e:
        logger.error(f"Error in evaluatesubmission: {e}")
        return https_fn.Response(json.dumps({'error': str(e)}), status=500)

@https_fn.on_request(memory=options.MemoryOption.GB_1, cors=options.CorsOptions(
    cors_origins=[r"https://nndl-course-leaderboard\.web\.app"],  # Specify your frontend domain
    cors_methods=["GET", "POST", "OPTIONS"],  # Include OPTIONS for preflight requests
)
)
def leaderboard(req: https_fn.Request) -> https_fn.Response:
    """Get the leaderboard data sorted by superAccuracy in descending order."""
    try:
        # Check if the request method is GET
        if req.method != 'GET':
            return https_fn.Response(json.dumps({'error': 'Method not allowed'}), status=405)
        
        submissions_ref = db.reference('submissions')
        # Order by superAccuracy in descending order
        submissions = submissions_ref.order_by_child('metrics/superAccuracy').get()
        
        if not submissions:
            return https_fn.Response(json.dumps([]), status=200, content_type="application/json")
        
        # Convert to list and sort
        submissions_list = [
            {**submission, 'id': key} 
            for key, submission in submissions.items()
        ]
        
        # Sort by superAccuracy in descending order
        submissions_list.sort(key=lambda x: x['metrics']['superAccuracy'], reverse=True)
        
        return https_fn.Response(
            json.dumps(submissions_list),
            status=200,
            content_type="application/json"
        )
    
    except Exception as e:
        return https_fn.Response(json.dumps({'error': str(e)}), status=500)