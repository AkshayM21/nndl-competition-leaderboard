import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { uploadCSV, saveSubmission } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { evaluateSubmission } from '../../services/api'; 


const ADMIN_EMAIL = process.env.REACT_APP_ADMIN_EMAIL;


const SubmissionForm = () => {
  const { currentUser, isAdmin, email } = useAuth();
  
  const [teamName, setTeamName] = useState('');
  const [modelName, setModelName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setFileName(selectedFile.name);
    } else {
      setError('Please upload a valid CSV file');
      setFile(null);
      setFileName('');
    }
  };
  
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // Validation
    if (!teamName || !modelName || !description || !file) {
      setError('Please fill out all fields and upload a CSV file');
      return;
    }
    
    // Check if teamName is "Baseline" and validate permission
    if (teamName === "Baseline" && email !== ADMIN_EMAIL) {
      setError('Only authorized users can submit under the team name "Baseline"');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // 1. Upload CSV to Firebase Storage
      const fileUrl = await uploadCSV(file, email);
      
      // 2. Send to Flask backend for evaluation
      //before: /api/evaluatesubmission
      const response = await evaluateSubmission({
        fileUrl,
        teamName,
        modelName,
        description,
        email: email
      });
      
      // // 3. Store submission data in Firebase Realtime Database
      // await saveSubmission({
      //   teamName,
      //   modelName,
      //   description,
      //   email: email,
      //   fileUrl,
      //   metrics: response.data.metrics
      // });
      
      // Reset form
      setTeamName('');
      setModelName('');
      setDescription('');
      setFile(null);
      setFileName('');
      setSuccess(true);
    } catch (error) {
      console.error("Error submitting model: ", error);
      setError(error.response?.data?.message || error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCloseSnackbar = () => {
    setSuccess(false);
  };
  
  return (
    <Paper elevation={2} sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" component="h2" gutterBottom align="center">
        Submit Your Model
      </Typography>
      
      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              label="Team Name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              disabled={loading}
              error={teamName === "Baseline" && !isAdmin}
              helperText={teamName === "Baseline" && !isAdmin ? "Reserved team name" : ""}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              label="Model Name"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              disabled={loading}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              label="Model Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={3}
              disabled={loading}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Box
              sx={{
                border: '1px dashed',
                borderColor: 'grey.400',
                borderRadius: 1,
                p: 3,
                textAlign: 'center'
              }}
            >
              <input
                accept=".csv"
                id="contained-button-file"
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                disabled={loading}
              />
              <label htmlFor="contained-button-file">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUploadIcon />}
                  disabled={loading}
                >
                  Upload CSV File
                </Button>
              </label>
              
              {fileName && (
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Selected file: {fileName}
                </Typography>
              )}
            </Box>
          </Grid>
          
          {error && (
            <Grid item xs={12}>
              <Alert severity="error">{error}</Alert>
            </Grid>
          )}
          
          <Grid item xs={12} sx={{ mt: 2, textAlign: 'center' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={loading}
              sx={{ minWidth: 200 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Submit Model'}
            </Button>
          </Grid>
        </Grid>
      </Box>
      
      <Snackbar open={success} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          Model submitted successfully!
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default SubmissionForm;