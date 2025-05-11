import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import SubmissionForm from '../Submission/SubmissionForm';
import LeaderboardTable from '../Leaderboard/LeaderboardTable';

// TabPanel component to handle tab content
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Main TabContainer component
const TabContainer = () => {
  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={value} 
          onChange={handleChange} 
          aria-label="leaderboard tabs"
          centered
        >
          <Tab label="Submit Model" id="tab-0" aria-controls="tabpanel-0" />
          <Tab label="Leaderboard" id="tab-1" aria-controls="tabpanel-1" />
        </Tabs>
      </Box>
      
      <TabPanel value={value} index={0}>
        <SubmissionForm />
      </TabPanel>
      
      <TabPanel value={value} index={1}>
        <LeaderboardTable />
      </TabPanel>
    </Box>
  );
};

export default TabContainer;