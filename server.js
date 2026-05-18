// Proxy server.js to bypass Render's hardcoded startCommand bug.
// If Render stubbornly executes `node server.js` at the root, this will intercept it
// and execute the actual backend server.

require('./backend/server.js');
