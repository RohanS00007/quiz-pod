const pdf = require('pdf-parse');
console.log('Type of pdf-parse export:', typeof pdf);
console.log('Export keys:', Object.keys(pdf || {}));
