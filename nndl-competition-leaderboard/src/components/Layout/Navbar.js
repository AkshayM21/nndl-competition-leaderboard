import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box,
  Avatar
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { logOut } from '../../services/firebase';

const Navbar = () => {
  const { currentUser, isAuthenticated } = useAuth();
  
  const handleLogout = async () => {
    try {
      await logOut();
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };
  
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          NNDL Course Leaderboard
        </Typography>
        
        {isAuthenticated && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
              <Avatar 
                sx={{ width: 32, height: 32, mr: 1 }}
                alt={currentUser.displayName} 
                src={currentUser.photoURL} 
              />
              <Typography variant="body2">
                {currentUser.displayName}
              </Typography>
            </Box>
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;