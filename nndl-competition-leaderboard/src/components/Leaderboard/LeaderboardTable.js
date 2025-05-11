import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  Tooltip,
  TableSortLabel
} from '@mui/material';
import { getLeaderboardData } from '../../services/firebase';

// Format date to a readable format
const formatDate = (dateString) => {
  console.log(dateString)
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'America/Anchorage',
  };
  return new Date(dateString).toLocaleDateString('en-US', options) + ' ET';
};

// Format number as percentage
const formatPercent = (value) => {
  return `${(value * 100).toFixed(2)}%`;
};

const LeaderboardTable = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orderBy, setOrderBy] = useState('metrics.superAccuracy');
  const [order, setOrder] = useState('desc');

  // Fetch leaderboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getLeaderboardData();
        setSubmissions(data);
      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
        setError('Failed to load leaderboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Set up interval to refresh data every 60 seconds
    const intervalId = setInterval(fetchData, 60000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Handle sorting
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    
    // Sort submissions based on the selected property
    const sortedSubmissions = [...submissions].sort((a, b) => {
      // Get nested properties if needed
      const getNestedProperty = (obj, path) => {
        return path.split('.').reduce((prev, curr) => 
          prev && prev[curr] ? prev[curr] : null, obj);
      };
      
      const valueA = getNestedProperty(a, property);
      const valueB = getNestedProperty(b, property);
      
      // Handle null values
      if (valueA === null) return 1;
      if (valueB === null) return -1;
      
      // Sort based on order
      return order === 'asc' 
        ? valueA < valueB ? -1 : 1
        : valueA > valueB ? -1 : 1;
    });
    
    setSubmissions(sortedSubmissions);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (submissions.length === 0) {
    return (
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography>No submissions yet. Be the first to submit your model!</Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table sx={{ minWidth: 650 }} aria-label="leaderboard table">
        <TableHead>
          <TableRow>
            <TableCell>Rank</TableCell>
            <TableCell>
              <TableSortLabel
                active={orderBy === 'teamName'}
                direction={orderBy === 'teamName' ? order : 'asc'}
                onClick={() => handleRequestSort('teamName')}
              >
                Team Name
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={orderBy === 'modelName'}
                direction={orderBy === 'modelName' ? order : 'asc'}
                onClick={() => handleRequestSort('modelName')}
              >
                Model Name
              </TableSortLabel>
            </TableCell>
            <TableCell>Description</TableCell>
            <TableCell>
              <TableSortLabel
                active={orderBy === 'submissionTime'}
                direction={orderBy === 'submissionTime' ? order : 'asc'}
                onClick={() => handleRequestSort('submissionTime')}
              >
                Submission Time
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Overall superclass accuracy">
                <TableSortLabel
                  active={orderBy === 'metrics.superAccuracy'}
                  direction={orderBy === 'metrics.superAccuracy' ? order : 'asc'}
                  onClick={() => handleRequestSort('metrics.superAccuracy')}
                >
                  Super Acc.
                </TableSortLabel>
              </Tooltip>
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Seen superclass accuracy">
                <TableSortLabel
                  active={orderBy === 'metrics.seenSuperAccuracy'}
                  direction={orderBy === 'metrics.seenSuperAccuracy' ? order : 'asc'}
                  onClick={() => handleRequestSort('metrics.seenSuperAccuracy')}
                >
                  Seen Super Acc.
                </TableSortLabel>
              </Tooltip>
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Unseen superclass accuracy">
                <TableSortLabel
                  active={orderBy === 'metrics.unseenSuperAccuracy'}
                  direction={orderBy === 'metrics.unseenSuperAccuracy' ? order : 'asc'}
                  onClick={() => handleRequestSort('metrics.unseenSuperAccuracy')}
                >
                  Unseen Super Acc.
                </TableSortLabel>
              </Tooltip>
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Overall subclass accuracy">
                <TableSortLabel
                  active={orderBy === 'metrics.subAccuracy'}
                  direction={orderBy === 'metrics.subAccuracy' ? order : 'asc'}
                  onClick={() => handleRequestSort('metrics.subAccuracy')}
                >
                  Sub Acc.
                </TableSortLabel>
              </Tooltip>
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Seen subclass accuracy">
                <TableSortLabel
                  active={orderBy === 'metrics.seenSubAccuracy'}
                  direction={orderBy === 'metrics.seenSubAccuracy' ? order : 'asc'}
                  onClick={() => handleRequestSort('metrics.seenSubAccuracy')}
                >
                  Seen Sub Acc.
                </TableSortLabel>
              </Tooltip>
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Unseen subclass accuracy">
                <TableSortLabel
                  active={orderBy === 'metrics.unseenSubAccuracy'}
                  direction={orderBy === 'metrics.unseenSubAccuracy' ? order : 'asc'}
                  onClick={() => handleRequestSort('metrics.unseenSubAccuracy')}
                >
                  Unseen Sub Acc.
                </TableSortLabel>
              </Tooltip>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {submissions.map((row, index) => (
            <TableRow
              key={row.id}
              sx={{ 
                '&:last-child td, &:last-child th': { border: 0 },
                ...(row.teamName === 'Baseline' ? { fontWeight: 'bold', backgroundColor: 'rgba(0, 0, 0, 0.04)' } : {})
              }}
            >
              <TableCell component="th" scope="row">
                {index + 1}
              </TableCell>
              <TableCell sx={{ fontWeight: row.teamName === 'Baseline' ? 'bold' : 'normal' }}>
                {row.teamName}
              </TableCell>
              <TableCell>{row.modelName}</TableCell>
              <TableCell>
                <Tooltip title={row.description} placement="top-start">
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      maxWidth: 200, 
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {row.description}
                  </Typography>
                </Tooltip>
              </TableCell>
              <TableCell>{formatDate(row.submissionTime)}</TableCell>
              <TableCell align="right">{formatPercent(row.metrics.superAccuracy)}</TableCell>
              <TableCell align="right">{formatPercent(row.metrics.seenSuperAccuracy)}</TableCell>
              <TableCell align="right">{formatPercent(row.metrics.unseenSuperAccuracy)}</TableCell>
              <TableCell align="right">{formatPercent(row.metrics.subAccuracy)}</TableCell>
              <TableCell align="right">{formatPercent(row.metrics.seenSubAccuracy)}</TableCell>
              <TableCell align="right">{formatPercent(row.metrics.unseenSubAccuracy)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default LeaderboardTable;