import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Container,
  Alert,
  Snackbar
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { signInWithGoogle } from '../../services/firebase';

const Login = () => {
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      setError(error.message);
      setOpen(true);
    }
  };

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center' 
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          NNDL Course Leaderboard
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 4, textAlign: 'center' }}>
          Please sign in with your Columbia University or Barnard College email address to access the leaderboard.
        </Typography>
        
        <Box sx={{ width: '100%', maxWidth: 300 }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            startIcon={<GoogleIcon />}
            onClick={handleLogin}
            sx={{ 
              py: 1.5, 
              backgroundColor: '#4285F4',
              '&:hover': {
                backgroundColor: '#3367D6',
              }
            }}
          >
            Sign in with Google
          </Button>
        </Box>
        
        <Typography variant="caption" sx={{ mt: 4, color: 'text.secondary' }}>
          Only @columbia.edu and @barnard.edu email domains are permitted.
        </Typography>
      </Paper>
      
      <Snackbar open={open} autoHideDuration={6000} onClose={handleClose}>
        <Alert onClose={handleClose} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Login;