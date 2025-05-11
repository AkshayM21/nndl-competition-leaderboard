import React from 'react';
import { Box, CssBaseline, Container, ThemeProvider, createTheme } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Auth/Login';
import Navbar from './components/Layout/Navbar';
import TabContainer from './components/Layout/TabPanel';

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

// Protected route component to check authentication
const ProtectedContent = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Container component="main" sx={{ mt: 4, mb: 4, flex: 1 }}>
        <TabContainer />
      </Container>
      <Box 
        component="footer" 
        sx={{ 
          py: 3, 
          px: 2, 
          mt: 'auto', 
          backgroundColor: (theme) => theme.palette.grey[200] 
        }}
      >
        <Container maxWidth="sm">
          <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
            
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

// Main App component
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <ProtectedContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;