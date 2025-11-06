// ============ CONFIG ============
const API_URL = '###API_URL###';
const COGNITO_USER_POOL_ID = '##CognitoUserPoolID###'; 
const COGNITO_CLIENT_ID = '###CognitoClientID###'; 

const S3_BUCKET = '###S3BucketName###';
const S3_REGION = '###S3Region###';
const S3_ACCESS_KEY = '###S3AccessKey###';
const S3_SECRET_KEY = '###S3SecretKey###';
// ======================================================



// Cognito setup
const poolData = {
    UserPoolId: COGNITO_USER_POOL_ID,
    ClientId: COGNITO_CLIENT_ID
};
const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

let currentUser = null;
let currentUserId = null;
let currentUsername = null;
let currentEmail = null;
let idToken = null;
let allPosts = [];
let currentPost = null;
let cognitoUser = null;

// Page load
window.addEventListener('DOMContentLoaded', function() {
    checkAuth();
});

// ============ AUTH FUNCTIONS ============

function checkAuth() {
    currentUser = userPool.getCurrentUser();
    
    if (currentUser) {
        currentUser.getSession((err, session) => {
            if (err) {
                showAuthSection();
                return;
            }
            if (session.isValid()) {
                idToken = session.getIdToken().getJwtToken();
                currentUserId = session.getIdToken().payload.sub;
                
                currentUser.getUserAttributes((err, attributes) => {
                    if (!err) {
                        currentEmail = attributes.find(attr => attr.Name === 'email')?.Value;
                        currentUsername = attributes.find(attr => attr.Name === 'name')?.Value || 'User';
                        goToMainBlog();
                    }
                });
            } else {
                showAuthSection();
            }
        });
    } else {
        showAuthSection();
    }
}

function showAuthSection() {
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('mainBlogSection').classList.add('hidden');
    document.getElementById('myBlogsSection').classList.add('hidden');
}

function showLoginForm() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('signupForm').classList.add('hidden');
    document.getElementById('verifyForm').classList.add('hidden');
}

function showSignupForm() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('signupForm').classList.remove('hidden');
    document.getElementById('verifyForm').classList.add('hidden');
}

function handleSignup() {
    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;

    if (!username || !email || !password) {
        alert('Please fill in all fields');
        return;
    }

    if (password.length < 8) {
        alert('Password must be at least 8 characters');
        return;
    }

    const attributeList = [
        new AmazonCognitoIdentity.CognitoUserAttribute({
            Name: 'email',
            Value: email
        }),
        new AmazonCognitoIdentity.CognitoUserAttribute({
            Name: 'name',
            Value: username
        })
    ];

    userPool.signUp(email, password, attributeList, null, (err, result) => {
        if (err) {
            alert('Signup failed: ' + err.message);
            return;
        }
        alert('Signup successful! Check your email for verification code.');
        cognitoUser = result.user;
        document.getElementById('signupForm').classList.add('hidden');
        document.getElementById('verifyForm').classList.remove('hidden');
    });
}

function handleVerify() {
    const code = document.getElementById('verifyCode').value.trim();

    if (!code) {
        alert('Please enter verification code');
        return;
    }

    cognitoUser.confirmRegistration(code, true, (err, result) => {
        if (err) {
            alert('Verification failed: ' + err.message);
            return;
        }
        alert('Email verified! Please login.');
        showLoginForm();
    });
}

function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        alert('Please fill in all fields');
        return;
    }

    const authenticationData = {
        Username: email,
        Password: password
    };

    const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);

    const userData = {
        Username: email,
        Pool: userPool
    };

    cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
            idToken = result.getIdToken().getJwtToken();
            currentUserId = result.getIdToken().payload.sub;
            currentEmail = result.getIdToken().payload.email;
            
            cognitoUser.getUserAttributes((err, attributes) => {
                if (!err) {
                    currentUsername = attributes.find(attr => attr.Name === 'name')?.Value || 'User';
                }
                currentUser = cognitoUser;
                goToMainBlog();
            });
        },
        onFailure: (err) => {
            alert('Login failed: ' + err.message);
        }
    });
}

function handleLogout() {
    if (currentUser) {
        currentUser.signOut();
    }
    currentUser = null;
    currentUserId = null;
    currentUsername = null;
    currentEmail = null;
    idToken = null;
    showAuthSection();
}

// ============ PROFILE FUNCTIONS ============

function showProfile() {
    document.getElementById('profileName').textContent = currentUsername;
    document.getElementById('profileEmail').textContent = currentEmail;
    document.getElementById('displayUsername').textContent = currentUsername;
    document.getElementById('displayEmail').textContent = currentEmail;
    document.getElementById('profileAvatar').textContent = currentUsername.charAt(0).toUpperCase();
    
    document.getElementById('profileView').classList.remove('hidden');
    document.getElementById('profileEdit').classList.add('hidden');
    document.getElementById('profileModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeProfile() {
    document.getElementById('profileModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function showEditProfile() {
    document.getElementById('editUsername').value = currentUsername;
    document.getElementById('profileView').classList.add('hidden');
    document.getElementById('profileEdit').classList.remove('hidden');
}

function cancelEditProfile() {
    document.getElementById('profileView').classList.remove('hidden');
    document.getElementById('profileEdit').classList.add('hidden');
}

function saveProfile() {
    const newUsername = document.getElementById('editUsername').value.trim();
    
    if (!newUsername) {
        alert('Username cannot be empty');
        return;
    }

    const attributeList = [
        new AmazonCognitoIdentity.CognitoUserAttribute({
            Name: 'name',
            Value: newUsername
        })
    ];

    currentUser.updateAttributes(attributeList, (err, result) => {
        if (err) {
            alert('Failed to update profile: ' + err.message);
            return;
        }
        
        currentUsername = newUsername;
        alert('Profile updated successfully!');
        closeProfile();
    });
}

// ============ NAVIGATION ============

function goToMainBlog() {
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('mainBlogSection').classList.remove('hidden');
    document.getElementById('myBlogsSection').classList.add('hidden');
    loadAllPosts();
}

function goToMyBlogs() {
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('mainBlogSection').classList.add('hidden');
    document.getElementById('myBlogsSection').classList.remove('hidden');
    loadMyPosts();
}

// ============ CREATE POST FORMS ============

function showCreateFormMain() {
    document.getElementById('createFormMain').classList.remove('hidden');
}

function hideCreateFormMain() {
    document.getElementById('createFormMain').classList.add('hidden');
    document.getElementById('titleMain').value = '';
    document.getElementById('contentMain').value = '';
    document.getElementById('imageUrlMain').value = '';
}

function showCreateFormMy() {
    document.getElementById('createFormMy').classList.remove('hidden');
}

function hideCreateFormMy() {
    document.getElementById('createFormMy').classList.add('hidden');
    document.getElementById('titleMy').value = '';
    document.getElementById('contentMy').value = '';
    document.getElementById('imageUrlMy').value = '';
}

// ============ BLOG FUNCTIONS ============

async function uploadImageToS3(file, section) {
    if (!file) return null;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return null;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return null;
    }
    
    // Show progress bar
    const progressDiv = document.getElementById(`uploadProgress${section === 'main' ? 'Main' : 'My'}`);
    const progressBar = document.getElementById(`uploadBar${section === 'main' ? 'Main' : 'My'}`);
    progressDiv.style.display = 'block';
    progressBar.style.width = '30%';
    
    try {
        // Configure AWS SDK
        AWS.config.update({
            accessKeyId: S3_ACCESS_KEY,
            secretAccessKey: S3_SECRET_KEY,
            region: S3_REGION
        });
        
        const s3 = new AWS.S3();
        
        // Generate unique filename
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `blog-images/${timestamp}-${safeName}`;
        
        // Prepare upload parameters
        const params = {
            Bucket: S3_BUCKET,
            Key: filename,
            Body: file,
            ContentType: file.type
        };
        
        // Upload to S3
        progressBar.style.width = '60%';
        
        const data = await s3.upload(params).promise();
        
        progressBar.style.width = '100%';
        
        // Hide progress bar after a short delay
        setTimeout(() => {
            progressDiv.style.display = 'none';
            progressBar.style.width = '0%';
        }, 500);
        
        // Return the public URL
        return data.Location;
        
    } catch (error) {
        console.error('Upload error:', error);
        progressDiv.style.display = 'none';
        progressBar.style.width = '0%';
        alert('Failed to upload image: ' + error.message + '\n\nPlease check:\n1. AWS credentials are correct\n2. S3 bucket permissions are set\n3. Internet connection is stable');
        return null;
    }
}

async function createPostMain() {
    const title = document.getElementById('titleMain').value.trim();
    const content = document.getElementById('contentMain').value.trim();
    const imageFile = document.getElementById('imageFileMain').files[0];
    let imageUrl = document.getElementById('imageUrlMain').value.trim();

    // If user uploaded a file, upload it first
    if (imageFile) {
        imageUrl = await uploadImageToS3(imageFile, 'main');
        if (!imageUrl) return; // Upload failed
    }

    await createPost(title, content, imageUrl, 'main');
}

async function createPostMy() {
    const title = document.getElementById('titleMy').value.trim();
    const content = document.getElementById('contentMy').value.trim();
    const imageFile = document.getElementById('imageFileMy').files[0];
    let imageUrl = document.getElementById('imageUrlMy').value.trim();

    // If user uploaded a file, upload it first
    if (imageFile) {
        imageUrl = await uploadImageToS3(imageFile, 'my');
        if (!imageUrl) return; // Upload failed
    }

    await createPost(title, content, imageUrl, 'my');
}

async function createPost(title, content, imageUrl, section) {
    if (!title || !content) {
        alert('Please fill in title and content!');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': idToken
            },
            body: JSON.stringify({
                title: title,
                author: currentUsername,
                content: content,
                imageUrl: imageUrl,
                userId: currentUserId
            })
        });

        if (response.ok) {
            alert('Post created successfully!');
            if (section === 'main') {
                hideCreateFormMain();
                loadAllPosts();
            } else {
                hideCreateFormMy();
                loadMyPosts();
            }
        } else {
            const error = await response.json();
            alert('Error creating post: ' + (error.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error creating post. Check console for details.');
    }
}

async function loadAllPosts() {
    try {
        const response = await fetch(`${API_URL}/posts`, {
            headers: {
                'Authorization': idToken
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load posts');
        }
        
        allPosts = await response.json();
        displayAllPosts();
    } catch (error) {
        console.error('Error loading posts:', error);
        document.getElementById('allPosts').innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>Error loading posts</p></div>';
    }
}

async function loadMyPosts() {
    try {
        const response = await fetch(`${API_URL}/posts`, {
            headers: {
                'Authorization': idToken
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load posts');
        }
        
        allPosts = await response.json();
        displayMyPosts();
    } catch (error) {
        console.error('Error loading posts:', error);
        document.getElementById('myPosts').innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>Error loading posts</p></div>';
    }
}

function displayAllPosts() {
    const container = document.getElementById('allPosts');
    
    if (!allPosts || allPosts.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📝</div><h3>No posts yet</h3><p>Be the first to create one!</p></div>';
        return;
    }

    container.innerHTML = allPosts.map(post => {
        const isMyPost = post.userId === currentUserId;
        const excerpt = post.content.substring(0, 120) + (post.content.length > 120 ? '...' : '');
        
        return `
            <div class="blog-card" onclick="openPost('${post.postId}')">
                ${post.imageUrl 
                    ? `<img src="${escapeHtml(post.imageUrl)}" alt="${escapeHtml(post.title)}" class="blog-card-image" onerror="this.outerHTML='<div class=\\'blog-card-image no-image\\'>📄</div>'">` 
                    : '<div class="blog-card-image no-image">📄</div>'}
                <div class="blog-card-content">
                    <h3 class="blog-card-title">${escapeHtml(post.title)}</h3>
                    <p class="blog-card-excerpt">${escapeHtml(excerpt)}</p>
                    <div class="blog-card-meta">
                        <span>By ${escapeHtml(post.author)}</span>
                    </div>
                    ${isMyPost ? '<span class="user-badge">Your Post</span>' : ''}
                </div>
            </div>
        `;
    }).join('');
}

function displayMyPosts() {
    const container = document.getElementById('myPosts');
    const myPosts = allPosts.filter(post => post.userId === currentUserId);
    
    if (myPosts.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✍️</div><h3>You haven\'t created any posts yet</h3><p>Create your first post!</p></div>';
        return;
    }

    container.innerHTML = myPosts.map(post => {
        const excerpt = post.content.substring(0, 120) + (post.content.length > 120 ? '...' : '');
        
        return `
            <div class="blog-card" onclick="openPost('${post.postId}', true)">
                ${post.imageUrl 
                    ? `<img src="${escapeHtml(post.imageUrl)}" alt="${escapeHtml(post.title)}" class="blog-card-image" onerror="this.outerHTML='<div class=\\'blog-card-image no-image\\'>📄</div>'">` 
                    : '<div class="blog-card-image no-image">📄</div>'}
                <div class="blog-card-content">
                    <h3 class="blog-card-title">${escapeHtml(post.title)}</h3>
                    <p class="blog-card-excerpt">${escapeHtml(excerpt)}</p>
                    <div class="blog-card-meta">
                        <span>By ${escapeHtml(post.author)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function hideCreateFormMain() {
    document.getElementById('createFormMain').classList.add('hidden');
    document.getElementById('titleMain').value = '';
    document.getElementById('contentMain').value = '';
    document.getElementById('imageUrlMain').value = '';
    document.getElementById('imageFileMain').value = '';
}

function hideCreateFormMy() {
    document.getElementById('createFormMy').classList.add('hidden');
    document.getElementById('titleMy').value = '';
    document.getElementById('contentMy').value = '';
    document.getElementById('imageUrlMy').value = '';
    document.getElementById('imageFileMy').value = '';
}

// ============ POST MODAL ============

function openPost(postId, canDelete = false) {
    const post = allPosts.find(p => p.postId === postId);
    if (!post) return;
    
    currentPost = post;
    
    document.getElementById('modalTitle').textContent = post.title;
    document.getElementById('modalAuthor').textContent = '👤 ' + post.author;
    document.getElementById('modalDate').textContent = '📅 ' + formatDate(post.createdAt);
    document.getElementById('modalContent').textContent = post.content;
    
    const modalImage = document.getElementById('modalImage');
    if (post.imageUrl) {
        modalImage.src = post.imageUrl;
        modalImage.style.display = 'block';
    } else {
        modalImage.style.display = 'none';
    }
    
    const modalActions = document.getElementById('modalActions');
    if (canDelete) {
        modalActions.style.display = 'flex';
    } else {
        modalActions.style.display = 'none';
    }
    
    document.getElementById('postModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePostModal() {
    document.getElementById('postModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    currentPost = null;
}

async function deletePostFromModal() {
    if (!currentPost) return;
    
    if (!confirm('Are you sure you want to delete this post?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/posts/${currentPost.postId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': idToken
            }
        });

        if (response.ok) {
            alert('Post deleted successfully!');
            closePostModal();
            loadMyPosts();
        } else {
            alert('Error deleting post');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error deleting post');
    }
}

// ============ UTILITY FUNCTIONS ============

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}
