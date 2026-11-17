const fs = require('fs');
const path = require('path');

const srcDir = 'd:/KIAAN/Property-Management-Complex/Frontend/app/src';

const nameMap = {
  'Rajesh Kumar': 'Robert King',
  'Priya Sharma': 'Sarah Johnson',
  'Amit Verma': 'James Taylor',
  'Neha Gupta': 'Linda Martinez',
  'Vikram Singh': 'Alexander Wright',
  'Suresh Yadav': 'Michael Brown',
  'Kavita Reddy': 'Jennifer Lewis',
  'Ravi Patel': 'Christopher Lee',
  'Sneha Desai': 'Jessica Miller',
  'Arun Mehta': 'William Davis',
  'Deepa Nair': 'Olivia Carter',
  'Manish Joshi': 'Daniel Harris',
  'Rahul Kapoor': 'Robert Anderson',
  'Meena Iyer': 'Laura Thomas',
  'Sanjay Agarwal': 'Richard Martinez',
  'Ankit Tiwari': 'Kevin Miller',
  'Pooja Mishra': 'Amanda Clark',
  'Rohit Saxena': 'Daniel Lewis',
  'Divya Chopra': 'Rachel Moore',
  'Karan Malhotra': 'James White',
  'Nisha Rao': 'Sophia Garcia',
  'Rajiv Menon': 'Thomas King',
  'Preet Kaur': 'Linda Wright',
  'Ashok Bansal': 'Steven Scott',
  'Fatima Sheikh': 'Maria Green',
  'Manoj Kumar': 'Paul Harris',
  'Aarti Singh': 'Mary Robinson',
  'Rajan Pillai': 'Mark Thompson',
  'Dinesh Goyal': 'Steven Young',
  'Farhan Ali': 'Lisa Walker'
};

const emailMap = {
  'rajesh': 'robert',
  'priya': 'sarah',
  'amit': 'james',
  'neha': 'linda',
  'vikram': 'alexander',
  'suresh': 'michael',
  'kavita': 'jennifer',
  'ravi': 'christopher',
  'sneha': 'jessica',
  'arun': 'william',
  'deepa': 'olivia',
  'manish': 'daniel',
  'rahul': 'robert.a',
  'meena': 'laura',
  'sanjay': 'richard',
  'ankit': 'kevin',
  'pooja': 'amanda',
  'rohit': 'daniel.l',
  'divya': 'rachel',
  'karan': 'james.w',
  'nisha': 'sophia',
  'rajiv': 'thomas',
  'preet': 'linda.w',
  'ashok': 'steven',
  'fatima': 'maria',
  'manoj': 'paul',
  'aarti': 'mary',
  'rajan': 'mark',
  'dinesh': 'steven.y',
  'farhan': 'lisa'
};

function getAllFiles(dirPath, arrayOfFiles) {
  const currentFiles = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  currentFiles.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

let phoneCounter = 2000;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  const initialContent = content;

  // Replace names
  for (const [indianName, westernName] of Object.entries(nameMap)) {
    content = content.replace(new RegExp(indianName, 'g'), westernName);
  }

  // Replace emails
  for (const [indianEmail, westernEmail] of Object.entries(emailMap)) {
    content = content.replace(new RegExp(indianEmail + '@', 'g'), westernEmail + '@');
  }

  // Replace remaining phone numbers
  content = content.replace(/['"]9\d{9}['"]/g, () => {
    phoneCounter++;
    return `'555-010-${phoneCounter}'`;
  });

  if (content !== initialContent) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated: ${filePath}`);
  }
}

const files = getAllFiles(srcDir);
for (const file of files) {
  processFile(file);
}
console.log('✅ Global replacement done!');
