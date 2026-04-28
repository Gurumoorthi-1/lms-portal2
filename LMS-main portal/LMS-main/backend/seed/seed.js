  import mongoose from 'mongoose';
  import dotenv from 'dotenv';
  import Course from '../models/Course.js';
  import Topic from '../models/Topic.js';
  import Problem from '../models/Problem.js';

  dotenv.config();

  const starterCodes = {
    javascript: `// Write your solution here\nconst readline = require('readline');\nconst rl = readline.createInterface({ input: process.stdin });\nrl.on('line', (line) => {\n  const input = line.trim();\n  // Your logic here\n  console.log(input);\n});`,
    python: `# Write your solution here\nimport sys\nfor line in sys.stdin:\n    data = line.strip()\n    # Your logic here\n    print(data)`,
    java: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        while(sc.hasNextLine()) {\n            String line = sc.nextLine();\n            // Your logic here\n            System.out.println(solve(line));\n        }\n    }\n    \n    static String solve(String input) {\n        return input;\n    }\n}`,
    cpp: `#include <iostream>\n#include <string>\nusing namespace std;\n\nstring solve(string input) {\n    // Your logic here\n    return input;\n}\n\nint main() {\n    string line;\n    while (getline(cin, line)) {\n        cout << solve(line) << endl;\n    }\n    return 0;\n}`,
    html: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Solution</title>\n</head>\n<body>\n  <!-- Your HTML here -->\n</body>\n</html>`,
    css: `/* Your CSS solution here */\nbody {\n  margin: 0;\n  font-family: Arial, sans-serif;\n}`,
    bash: `#!/bin/bash\n# Your bash solution here\nread input\necho "$input"`,
    yaml: `# Your YAML configuration here\nversion: '3.8'\nservices:\n  app:\n    image: nginx:latest`
  };

  const courses = [
    { title: 'Web Development', slug: 'web-dev', description: 'Master HTML, CSS, JavaScript and modern web frameworks.', icon: '🌐', color: '#3B82F6', defaultLanguage: 'javascript', allowedLanguages: ['html','css','javascript'], level: 'Beginner' },
    { title: 'DSA', slug: 'dsa', description: 'Data Structures & Algorithms. Crack coding interviews at top tech companies.', icon: '🧮', color: '#10B981', defaultLanguage: 'java', allowedLanguages: ['java','cpp','python'], level: 'Intermediate' },
    { title: 'DevOps', slug: 'devops', description: 'Learn Docker, Kubernetes, CI/CD pipelines and cloud infrastructure.', icon: '⚙️', color: '#F59E0B', defaultLanguage: 'bash', allowedLanguages: ['bash','yaml'], level: 'Hard' },
    { title: 'AI/ML', slug: 'ai-ml', description: 'Machine Learning, Deep Learning, Neural Networks with Python.', icon: '🤖', color: '#8B5CF6', defaultLanguage: 'python', allowedLanguages: ['python'], level: 'Hard' }
  ];

  const topicsData = {
    'web-dev': [
      { title: 'HTML Fundamentals', order:1, language:'html', icon:'📄', description:'Learn HTML structure and semantic markup', difficulty:'Easy' },
      { title: 'CSS Styling', order:2, language:'css', icon:'🎨', description:'Style webpages with CSS, Flexbox, Grid', difficulty:'Easy' },
      { title: 'JavaScript Basics', order:3, language:'javascript', icon:'⚡', description:'Variables, functions, DOM manipulation', difficulty:'Medium' },
      { title: 'DOM Manipulation', order:4, language:'javascript', icon:'🔧', description:'Dynamic HTML updates with JS', difficulty:'Medium' },
      { title: 'ES6+ Features', order:5, language:'javascript', icon:'🚀', description:'Arrow functions, Promises, async/await', difficulty:'Medium' },
      { title: 'Responsive Design', order:6, language:'css', icon:'📱', description:'Mobile-first design patterns', difficulty:'Medium' }
    ],
    'dsa': [
      { title: 'Arrays & Strings', order:1, language:'java', icon:'📊', description:'Foundation data structures', difficulty:'Easy' },
      { title: 'Linked Lists', order:2, language:'java', icon:'🔗', description:'Singly, doubly linked lists', difficulty:'Medium' },
      { title: 'Stacks & Queues', order:3, language:'java', icon:'📦', description:'LIFO and FIFO structures', difficulty:'Medium' },
      { title: 'Trees & Graphs', order:4, language:'java', icon:'🌳', description:'BFS, DFS algorithms', difficulty:'Hard' },
      { title: 'Dynamic Programming', order:5, language:'java', icon:'⚡', description:'Memoization and tabulation', difficulty:'Hard' },
      { title: 'Sorting Algorithms', order:6, language:'java', icon:'🔢', description:'Merge, quick, heap sort', difficulty:'Medium' }
    ],
    'devops': [
      { title: 'Linux & Bash', order:1, language:'bash', icon:'🐧', description:'Command line and shell scripting', difficulty:'Easy' },
      { title: 'Docker Basics', order:2, language:'yaml', icon:'🐳', description:'Containers and Dockerfile', difficulty:'Medium' },
      { title: 'Docker Compose', order:3, language:'yaml', icon:'🔧', description:'Multi-container applications', difficulty:'Medium' },
      { title: 'CI/CD Pipelines', order:4, language:'yaml', icon:'🔄', description:'GitHub Actions automation', difficulty:'Hard' },
      { title: 'Kubernetes', order:5, language:'yaml', icon:'☸️', description:'Container orchestration', difficulty:'Hard' },
      { title: 'Shell Scripting', order:6, language:'bash', icon:'📜', description:'Advanced bash scripting', difficulty:'Medium' }
    ],
    'ai-ml': [
      { title: 'Python for ML', order:1, language:'python', icon:'🐍', description:'NumPy, Pandas essentials', difficulty:'Easy' },
      { title: 'Linear Regression', order:2, language:'python', icon:'📈', description:'Supervised learning fundamentals', difficulty:'Medium' },
      { title: 'Classification', order:3, language:'python', icon:'🏷️', description:'Logistic regression, decision trees', difficulty:'Medium' },
      { title: 'Neural Networks', order:4, language:'python', icon:'🧠', description:'Build neural nets from scratch', difficulty:'Hard' },
      { title: 'Deep Learning', order:5, language:'python', icon:'🤖', description:'CNNs, RNNs with frameworks', difficulty:'Hard' },
      { title: 'NLP Basics', order:6, language:'python', icon:'💬', description:'Text processing and transformers', difficulty:'Hard' }
    ]
  };

  const problemData = {
    'Arrays & Strings': [
      { title:'Two Sum', description:'## Two Sum\n\nGiven an array of integers and a target, return indices of two numbers that add to target.\n\n**Input:** First line: space-separated numbers, Second line: target\n**Output:** Two indices', difficulty:'Easy', hints:['Use a hash map','For each number check if target-num exists'], examples:[{input:'2 7 11 15\n9',output:'0 1',explanation:'nums[0]+nums[1]=9'}], testCases:[{input:'2 7 11 15\n9',expectedOutput:'0 1'}], tags:['Array','Hash Map'] },
      { title:'Reverse String', description:'## Reverse a String\n\nReverse the input string.\n\n**Input:** A string\n**Output:** Reversed string', difficulty:'Easy', hints:['Two pointers from both ends'], examples:[{input:'hello',output:'olleh',explanation:'Characters reversed'}], testCases:[{input:'hello',expectedOutput:'olleh'},{input:'world',expectedOutput:'dlrow'}], tags:['String'] },
      { title:'Maximum Subarray', description:'## Maximum Subarray (Kadane\'s)\n\nFind the contiguous subarray with the largest sum.\n\n**Input:** Space-separated integers\n**Output:** Maximum sum', difficulty:'Medium', hints:["Kadane's algorithm",'Track current and max sum'], examples:[{input:'-2 1 -3 4 -1 2 1 -5 4',output:'6',explanation:'[4,-1,2,1] has sum 6'}], testCases:[{input:'-2 1 -3 4 -1 2 1 -5 4',expectedOutput:'6'}], tags:['Array','DP'] }
    ],
    'HTML Fundamentals': [
      { title:'Build a Basic Webpage', description:'## Build a Basic Webpage\n\nCreate a complete HTML5 page with header, nav (3 links), main section, and footer.\n\nUse semantic HTML5 tags.', difficulty:'Easy', hints:['Use header, nav, main, footer tags','Use <a> for links'], examples:[{input:'N/A',output:'Valid HTML page',explanation:'Semantic structure'}], testCases:[{input:'',expectedOutput:'valid'}], tags:['HTML','Semantic'] },
      { title:'Create a Contact Form', description:'## Contact Form\n\nBuild an HTML form with name, email, message fields and a submit button.\nAdd proper labels and validation.', difficulty:'Easy', hints:['Use <form> tag','Add required attribute'], examples:[{input:'N/A',output:'HTML form',explanation:'Form with validation'}], testCases:[{input:'',expectedOutput:'valid'}], tags:['HTML','Forms'] },
      { title:'Semantic Article Page', description:'## Semantic Article\n\nCreate an HTML article with title, author, sections, lists, blockquote and figure.', difficulty:'Medium', hints:['Use article, section tags','Use figure and figcaption'], examples:[{input:'N/A',output:'Semantic HTML',explanation:'Full semantic article'}], testCases:[{input:'',expectedOutput:'valid'}], tags:['HTML','Semantic'] }
    ],
    'CSS Styling': [
      { title:'Flexbox Navigation', description:'## Flexbox Navbar\n\nCreate a responsive nav bar using Flexbox:\n- Logo left, links center, button right\n- Dark background\n- Hover effects', difficulty:'Easy', hints:['display: flex','justify-content: space-between'], examples:[{input:'N/A',output:'CSS navbar',explanation:'Flexbox nav'}], testCases:[{input:'',expectedOutput:'valid'}], tags:['CSS','Flexbox'] },
      { title:'CSS Grid Gallery', description:'## Grid Photo Gallery\n\nBuild a responsive 3-column photo gallery using CSS Grid.\n- 3 cols desktop, 2 tablet, 1 mobile\n- Hover zoom effect', difficulty:'Medium', hints:['display: grid','grid-template-columns','@media queries'], examples:[{input:'N/A',output:'CSS grid layout',explanation:'Responsive gallery'}], testCases:[{input:'',expectedOutput:'valid'}], tags:['CSS','Grid'] },
      { title:'CSS Animations', description:'## CSS Loading Spinner\n\nCreate a loading spinner with:\n- Circular shape\n- Continuous rotation\n- Gradient color', difficulty:'Medium', hints:['@keyframes','animation property','border-radius: 50%'], examples:[{input:'N/A',output:'Spinner animation',explanation:'Rotating spinner'}], testCases:[{input:'',expectedOutput:'valid'}], tags:['CSS','Animation'] }
    ],
    'JavaScript Basics': [
      { title:'FizzBuzz', description:'## FizzBuzz\n\nFor numbers 1 to N:\n- Print "Fizz" for multiples of 3\n- Print "Buzz" for multiples of 5\n- Print "FizzBuzz" for both\n\n**Input:** N\n**Output:** Sequence', difficulty:'Easy', hints:['Use modulo %','Check 15 first'], examples:[{input:'5',output:'1\n2\nFizz\n4\nBuzz',explanation:'FizzBuzz to 5'}], testCases:[{input:'5',expectedOutput:'1\n2\nFizz\n4\nBuzz'}], tags:['JS','Loops'] },
      { title:'Array Methods', description:'## Array Transformation\n\nGiven comma-separated numbers:\n1. Filter even numbers\n2. Double them\n3. Return sum\n\n**Input:** comma-separated numbers\n**Output:** sum', difficulty:'Easy', hints:['Use .filter()','.map()','.reduce()'], examples:[{input:'1,2,3,4,5,6',output:'24',explanation:'Even: 2,4,6 doubled: 4,8,12 sum: 24'}], testCases:[{input:'1,2,3,4,5,6',expectedOutput:'24'}], tags:['JS','Array'] },
      { title:'Palindrome Check', description:'## Palindrome Checker\n\nCheck if a string is a palindrome (ignore case and non-alphanumeric).\n\n**Input:** string\n**Output:** true or false', difficulty:'Easy', hints:['Clean string first','Compare with reverse'], examples:[{input:'racecar',output:'true',explanation:'Same forwards and backwards'}], testCases:[{input:'racecar',expectedOutput:'true'},{input:'hello',expectedOutput:'false'}], tags:['JS','String'] }
    ],
    'Python for ML': [
      { title:'NumPy Array Operations', description:'## NumPy Basics\n\nCompute element-wise sum, dot product, and mean of first array.\n\n**Input:** Two lines of space-separated numbers\n**Output:** Three lines', difficulty:'Easy', hints:['import numpy as np','np.dot() for dot product'], examples:[{input:'1 2 3\n4 5 6',output:'5 7 9\n32\n2.0',explanation:'Sum, dot, mean'}], testCases:[{input:'1 2 3\n4 5 6',expectedOutput:'5 7 9\n32\n2.0'}], tags:['Python','NumPy'] },
      { title:'Data Statistics', description:'## Descriptive Statistics\n\nCompute mean, median, std, min, max for a dataset.\n\n**Input:** Space-separated numbers\n**Output:** 5 statistics (2 decimals)', difficulty:'Easy', hints:['Use numpy','round() to 2 decimals'], examples:[{input:'2 4 4 4 5 5 7 9',output:'5.0\n4.5\n2.0\n2\n9',explanation:'Statistical measures'}], testCases:[{input:'2 4 4 4 5 5 7 9',expectedOutput:'5.0\n4.5\n2.0\n2\n9'}], tags:['Python','Statistics'] },
      { title:'List Comprehensions', description:'## List Comprehensions\n\nGenerate squares of even numbers 0-20, then filter words longer than 5 chars.\n\n**Input:** Comma-separated words\n**Output:** Squares then filtered words', difficulty:'Easy', hints:['[expr for x in range if cond]','len() for string length'], examples:[{input:'hi,python,code,is,awesome',output:'0 4 16 36 64 100 144 196 256 324 400\npython awesome',explanation:'List comprehensions'}], testCases:[{input:'hi,python,code,is,awesome',expectedOutput:'0 4 16 36 64 100 144 196 256 324 400\npython awesome'}], tags:['Python','Comprehension'] }
    ],
    'Linux & Bash': [
      { title:'Word Count Script', description:'## Bash Word Counter\n\nRead a line from stdin, output:\n1. Number of words\n2. Uppercase version\n\n**Input:** A sentence\n**Output:** Count then uppercase', difficulty:'Easy', hints:['echo | wc -w','tr for uppercase'], examples:[{input:'hello world',output:'2\nHELLO WORLD',explanation:'Count and uppercase'}], testCases:[{input:'hello world',expectedOutput:'2\nHELLO WORLD'}], tags:['Bash','Text'] },
      { title:'Number Checker', description:'## Even/Odd Bash Script\n\nRead a number, print "even" or "odd".\n\n**Input:** A number\n**Output:** even or odd', difficulty:'Easy', hints:['Use $(( n % 2 ))','if [ condition ]'], examples:[{input:'4',output:'even',explanation:'4 is even'}], testCases:[{input:'4',expectedOutput:'even'},{input:'7',expectedOutput:'odd'}], tags:['Bash','Logic'] },
      { title:'Fibonacci Bash', description:'## Fibonacci in Bash\n\nPrint first N Fibonacci numbers.\n\n**Input:** N\n**Output:** Fibonacci sequence space-separated', difficulty:'Medium', hints:['Use a while loop','Track two previous values'], examples:[{input:'7',output:'0 1 1 2 3 5 8',explanation:'First 7 Fibonacci'}], testCases:[{input:'7',expectedOutput:'0 1 1 2 3 5 8'}], tags:['Bash','Math'] }
    ],
    'Docker Basics': [
      { title:'Write a Dockerfile', description:'## Node.js Dockerfile\n\nWrite a Dockerfile for a Node.js app:\n- Base: node:18-alpine\n- WORKDIR: /app\n- Install deps, copy code\n- Expose 3000\n- CMD: node server.js', difficulty:'Easy', hints:['FROM sets base image','RUN for commands','CMD for startup'], examples:[{input:'N/A',output:'Valid Dockerfile',explanation:'Node Dockerfile'}], testCases:[{input:'',expectedOutput:'FROM'}], tags:['Docker'] },
      { title:'Docker Compose Setup', description:'## Docker Compose\n\nCreate docker-compose.yml with:\n- nginx web service on port 80\n- postgres DB with env vars\n- Shared network', difficulty:'Medium', hints:['Use services key','ports: "80:80"','environment for env vars'], examples:[{input:'N/A',output:'docker-compose.yml',explanation:'Multi-service setup'}], testCases:[{input:'',expectedOutput:'version'}], tags:['Docker','Compose'] },
      { title:'Multi-Stage Build', description:'## Multi-Stage Dockerfile\n\nCreate multi-stage Dockerfile:\n- Stage 1: node:18-alpine, build React app\n- Stage 2: nginx:alpine, serve built files', difficulty:'Hard', hints:['FROM ... AS builder','COPY --from=builder','Reduces final image size'], examples:[{input:'N/A',output:'Multi-stage Dockerfile',explanation:'Optimized build'}], testCases:[{input:'',expectedOutput:'FROM'}], tags:['Docker','Optimization'] }
    ],
    'Linear Regression': [
      { title:'Mean Squared Error', description:'## Calculate MSE\n\nGiven actual and predicted values, calculate Mean Squared Error.\n\n**Input:** Two lines of space-separated numbers (actual, predicted)\n**Output:** MSE rounded to 4 decimals', difficulty:'Easy', hints:['MSE = mean((actual - predicted)^2)','Use numpy or manual loop'], examples:[{input:'3 5 2 7\n2.5 5 4 8',output:'1.0625',explanation:'MSE calculation'}], testCases:[{input:'3 5 2 7\n2.5 5 4 8',expectedOutput:'1.0625'}], tags:['ML','Statistics'] },
      { title:'Gradient Descent', description:'## Gradient Descent\n\nImplement gradient descent for y = mx + b.\nFind m and b that minimize MSE.\n\n**Input:** x values, y values, learning_rate, iterations\n**Output:** m and b rounded to 2 decimals', difficulty:'Medium', hints:['Initialize m=0, b=0','Compute gradients','Update: m = m - lr * grad_m'], examples:[{input:'1 2 3\n2 4 6\n0.01\n1000',output:'m=2.0 b=0.0',explanation:'Perfect linear fit'}], testCases:[{input:'1 2 3\n2 4 6\n0.01\n1000',expectedOutput:'m=2.0 b=0.0'}], tags:['ML','Optimization'] },
      { title:'Pearson Correlation', description:'## Pearson Correlation\n\nCalculate Pearson correlation coefficient.\n\n**Input:** Two lines of space-separated numbers\n**Output:** Correlation (4 decimals)', difficulty:'Easy', hints:['r = cov(X,Y) / (std(X) * std(Y))','Use numpy for easy calculation'], examples:[{input:'1 2 3 4 5\n5 4 3 2 1',output:'-1.0',explanation:'Perfect negative correlation'}], testCases:[{input:'1 2 3 4 5\n5 4 3 2 1',expectedOutput:'-1.0'}], tags:['ML','Statistics'] }
    ],
    'Linked Lists': [
      { title:'Reverse Linked List', description:'## Reverse Linked List\n\nReverse a linked list.\n\n**Input:** Space-separated numbers\n**Output:** Reversed sequence', difficulty:'Easy', hints:['Three pointers: prev, curr, next','Iteratively reverse'], examples:[{input:'1 2 3 4 5',output:'5 4 3 2 1',explanation:'List reversed'}], testCases:[{input:'1 2 3 4 5',expectedOutput:'5 4 3 2 1'}], tags:['Java','LinkedList'] },
      { title:'Find Middle Node', description:'## Find Middle of Linked List\n\nFind the middle node. If two middles exist, return the second.\n\n**Input:** Space-separated numbers\n**Output:** Middle value', difficulty:'Easy', hints:['Slow and fast pointer approach','Fast moves 2x, slow moves 1x'], examples:[{input:'1 2 3 4 5',output:'3',explanation:'Middle element'}], testCases:[{input:'1 2 3 4 5',expectedOutput:'3'},{input:'1 2 3 4',expectedOutput:'3'}], tags:['Java','LinkedList'] },
      { title:'Merge Two Sorted Lists', description:'## Merge Sorted Lists\n\nMerge two sorted linked lists.\n\n**Input:** Two sorted space-separated lists\n**Output:** Merged sorted list', difficulty:'Easy', hints:['Compare heads','Recursively merge remaining'], examples:[{input:'1 3 5\n2 4 6',output:'1 2 3 4 5 6',explanation:'Merged and sorted'}], testCases:[{input:'1 3 5\n2 4 6',expectedOutput:'1 2 3 4 5 6'}], tags:['Java','LinkedList','Merge'] }
    ]
  };

  const getDefaultProblems = (topicTitle, lang) => [
    { title:`${topicTitle} - Beginner`, description:`## ${topicTitle} Basics\n\nSolve this beginner challenge for ${topicTitle}.\n\n**Input:** A number N\n**Output:** N squared`, difficulty:'Easy', hints:['Think step by step'], examples:[{input:'5',output:'25',explanation:'5 squared'}], testCases:[{input:'5',expectedOutput:'25'},{input:'3',expectedOutput:'9'}], tags:[topicTitle] },
    { title:`${topicTitle} - Intermediate`, description:`## ${topicTitle} Intermediate\n\nApply ${topicTitle} concepts.\n\n**Input:** Space-separated numbers\n**Output:** Their sum`, difficulty:'Medium', hints:['Break it down'], examples:[{input:'1 2 3',output:'6',explanation:'Sum = 6'}], testCases:[{input:'1 2 3',expectedOutput:'6'}], tags:[topicTitle] },
    { title:`${topicTitle} - Hard`, description:`## ${topicTitle} Hard\n\nHarder challenge combining multiple concepts.\n\n**Input:** A number N\n**Output:** Nth Fibonacci`, difficulty:'Hard', hints:['Think recursively or with DP'], examples:[{input:'8',output:'21',explanation:'8th Fibonacci'}], testCases:[{input:'8',expectedOutput:'21'}], tags:[topicTitle] }
  ];

  const seed = async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('Connected to MongoDB');
      await Course.deleteMany();
      await Topic.deleteMany();
      await Problem.deleteMany();
      console.log('Cleared existing data');

      await Course.deleteMany({});
await Topic.deleteMany({});
await Problem.deleteMany({});

const createdCourses = await Course.insertMany(courses);
console.log(`Created ${createdCourses.length} courses`);
      let totalTopics = 0, totalProblems = 0;
      for (const course of createdCourses) {
        const topics = (topicsData[course.slug] || []).map(t => ({ ...t, courseId: course._id }));
        const createdTopics = await Topic.insertMany(topics);
        totalTopics += createdTopics.length;

        for (const topic of createdTopics) {
          const lang = topic.language || course.defaultLanguage;
          const code = starterCodes[lang] || starterCodes.python;
          const base = problemData[topic.title] || getDefaultProblems(topic.title, lang);
          const probs = base.map((p, i) => ({
            ...p,
            language: lang,
            allowedLanguages: [lang],
            starterCode: { [lang]: code },
            topicId: topic._id,
            courseId: course._id,
            order: i + 1
          }));
          await Problem.insertMany(probs);
          totalProblems += probs.length;
          await Topic.findByIdAndUpdate(topic._id, { totalProblems: probs.length });
        }
        await Course.findByIdAndUpdate(course._id, { totalTopics: createdTopics.length });
      }

      console.log(`Seed complete! ${totalTopics} topics, ${totalProblems} problems`);
      process.exit(0);
    } catch (err) {
      console.error('Seed error:', err);
      process.exit(1);
    }
  };

  seed();
