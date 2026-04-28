import { Injectable, NotFoundException } from '@nestjs/common';

export interface Challenge {
  id: number;
  language: string;
  title: string;
  difficulty: string;
  category: string;
  description: string;
  hint: string;
  starterCode: string;
  expectedOutput: string;
  validate?: (output: string) => boolean;
}

@Injectable()
export class ChallengesService {
  private readonly challenges: Challenge[] = [
    // ===== JAVASCRIPT (20 challenges) =====
    { id:1, language:'javascript', title:'Hello World', difficulty:'Easy', category:'Basics',
      description:'Print "Hello, World!" to the console.',
      hint:'Use console.log() to print output.',
      starterCode:'// Print Hello, World!\nconsole.log("Hello, World!");',
      expectedOutput:'Hello, World!',
      validate:(o)=>o.trim()==='Hello, World!' },

    { id:2, language:'javascript', title:'Sum of Two Numbers', difficulty:'Easy', category:'Math',
      description:'Write a function `sum(a, b)` that returns the sum. Print sum(5, 3).',
      hint:'Define a function with two parameters and use the + operator.',
      starterCode:'function sum(a, b) {\n  // your code here\n}\nconsole.log(sum(5, 3));',
      expectedOutput:'8',
      validate:(o)=>o.trim()==='8' },

    { id:3, language:'javascript', title:'FizzBuzz', difficulty:'Easy', category:'Logic',
      description:'Print 1 to 15. Multiples of 3: "Fizz", multiples of 5: "Buzz", both: "FizzBuzz".',
      hint:'Use a for loop and if-else with the modulo % operator.',
      starterCode:'for (let i = 1; i <= 15; i++) {\n  // your code here\n}',
      expectedOutput:'1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz',
      validate:(o)=>{ const l=o.trim().split('\n'); const e=['1','2','Fizz','4','Buzz','Fizz','7','8','Fizz','Buzz','11','Fizz','13','14','FizzBuzz']; return JSON.stringify(l)===JSON.stringify(e); } },

    { id:4, language:'javascript', title:'Reverse a String', difficulty:'Easy', category:'Strings',
      description:'Write `reverseString(str)` and print reverseString("hello").',
      hint:'Split the string into array, reverse it, then join back.',
      starterCode:'function reverseString(str) {\n  // your code here\n}\nconsole.log(reverseString("hello"));',
      expectedOutput:'olleh',
      validate:(o)=>o.trim()==='olleh' },

    { id:5, language:'javascript', title:'Factorial', difficulty:'Easy', category:'Math',
      description:'Write `factorial(n)` and print factorial(5).',
      hint:'factorial(5) = 5 × 4 × 3 × 2 × 1 = 120. Use a loop or recursion.',
      starterCode:'function factorial(n) {\n  // your code here\n}\nconsole.log(factorial(5));',
      expectedOutput:'120',
      validate:(o)=>o.trim()==='120' },

    { id:6, language:'javascript', title:'Palindrome Check', difficulty:'Easy', category:'Strings',
      description:'Write `isPalindrome(str)` that returns true/false. Print isPalindrome("racecar").',
      hint:'Compare the string with its reverse.',
      starterCode:'function isPalindrome(str) {\n  // your code here\n}\nconsole.log(isPalindrome("racecar"));',
      expectedOutput:'true',
      validate:(o)=>o.trim()==='true' },

    { id:7, language:'javascript', title:'Find Maximum', difficulty:'Easy', category:'Arrays',
      description:'Write `findMax(arr)` and print findMax([3,1,4,1,5,9,2,6]).',
      hint:'Use Math.max(...arr) or loop through the array.',
      starterCode:'function findMax(arr) {\n  // your code here\n}\nconsole.log(findMax([3,1,4,1,5,9,2,6]));',
      expectedOutput:'9',
      validate:(o)=>o.trim()==='9' },

    { id:8, language:'javascript', title:'Count Vowels', difficulty:'Easy', category:'Strings',
      description:'Write `countVowels(str)` and print countVowels("programming").',
      hint:'Check each character against "aeiouAEIOU".',
      starterCode:'function countVowels(str) {\n  // your code here\n}\nconsole.log(countVowels("programming"));',
      expectedOutput:'3',
      validate:(o)=>o.trim()==='3' },

    { id:9, language:'javascript', title:'Array Sum', difficulty:'Easy', category:'Arrays',
      description:'Write `arraySum(arr)` and print arraySum([1,2,3,4,5]).',
      hint:'Use reduce() or a loop to accumulate the sum.',
      starterCode:'function arraySum(arr) {\n  // your code here\n}\nconsole.log(arraySum([1,2,3,4,5]));',
      expectedOutput:'15',
      validate:(o)=>o.trim()==='15' },

    { id:10, language:'javascript', title:'Fibonacci', difficulty:'Medium', category:'Math',
      description:'Write `fibonacci(n)` returning the nth Fibonacci (0-indexed). Print fibonacci(10).',
      hint:'fib(0)=0, fib(1)=1. Each is sum of previous two.',
      starterCode:'function fibonacci(n) {\n  // your code here\n}\nconsole.log(fibonacci(10));',
      expectedOutput:'55',
      validate:(o)=>o.trim()==='55' },

    { id:11, language:'javascript', title:'Remove Duplicates', difficulty:'Medium', category:'Arrays',
      description:'Write `removeDuplicates(arr)` and print removeDuplicates([1,2,2,3,3,4]).join(",").',
      hint:'Use Set or filter with indexOf.',
      starterCode:'function removeDuplicates(arr) {\n  // your code here\n}\nconsole.log(removeDuplicates([1,2,2,3,3,4]).join(","));',
      expectedOutput:'1,2,3,4',
      validate:(o)=>o.trim()==='1,2,3,4' },

    { id:12, language:'javascript', title:'Flatten Array', difficulty:'Medium', category:'Arrays',
      description:'Flatten [[1,2],[3,4],[5,6]] one level. Print joined with commas.',
      hint:'Use flat() or concat with spread operator.',
      starterCode:'function flattenArray(arr) {\n  // your code here\n}\nconsole.log(flattenArray([[1,2],[3,4],[5,6]]).join(","));',
      expectedOutput:'1,2,3,4,5,6',
      validate:(o)=>o.trim()==='1,2,3,4,5,6' },

    { id:13, language:'javascript', title:'Capitalize Words', difficulty:'Medium', category:'Strings',
      description:'Write `capitalizeWords(str)`. Print capitalizeWords("hello world from xyzon").',
      hint:'Split, capitalize first letter of each word, join.',
      starterCode:'function capitalizeWords(str) {\n  // your code here\n}\nconsole.log(capitalizeWords("hello world from xyzon"));',
      expectedOutput:'Hello World From Xyzon',
      validate:(o)=>o.trim()==='Hello World From Xyzon' },

    { id:14, language:'javascript', title:'Binary Search', difficulty:'Medium', category:'Algorithms',
      description:'Implement `binarySearch(arr, target)`. Print binarySearch([1,3,5,7,9,11], 7).',
      hint:'Check middle element each iteration; go left or right based on comparison.',
      starterCode:'function binarySearch(arr, target) {\n  // your code here\n}\nconsole.log(binarySearch([1,3,5,7,9,11], 7));',
      expectedOutput:'3',
      validate:(o)=>o.trim()==='3' },

    { id:15, language:'javascript', title:'Prime Check', difficulty:'Medium', category:'Math',
      description:'Write `isPrime(n)` and print isPrime(17).',
      hint:'Check divisibility from 2 to Math.sqrt(n).',
      starterCode:'function isPrime(n) {\n  // your code here\n}\nconsole.log(isPrime(17));',
      expectedOutput:'true',
      validate:(o)=>o.trim()==='true' },

    { id:16, language:'javascript', title:'Sort Array', difficulty:'Medium', category:'Arrays',
      description:'Sort [64,25,12,22,11] ascending and print joined with commas.',
      hint:'Use .sort((a,b) => a-b) for numeric sorting.',
      starterCode:'const arr = [64,25,12,22,11];\n// sort and print\nconsole.log(arr.sort((a,b)=>a-b).join(","));',
      expectedOutput:'11,12,22,25,64',
      validate:(o)=>o.trim()==='11,12,22,25,64' },

    { id:17, language:'javascript', title:'Object Group Count', difficulty:'Hard', category:'Objects',
      description:'Count "fruit" in [{name:"apple",cat:"fruit"},{name:"banana",cat:"fruit"},{name:"carrot",cat:"veg"}].',
      hint:'Use reduce() to build an object with category keys and count values.',
      starterCode:'const items=[{name:"apple",cat:"fruit"},{name:"banana",cat:"fruit"},{name:"carrot",cat:"veg"}];\nfunction groupCount(arr){\n  // return object with category counts\n}\nconsole.log(groupCount(items)["fruit"]);',
      expectedOutput:'2',
      validate:(o)=>o.trim()==='2' },

    { id:18, language:'javascript', title:'Closure Counter', difficulty:'Hard', category:'Closures',
      description:'Implement `makeCounter()`. Print calling counter() three times.',
      hint:'Return a function from makeCounter. The inner function accesses outer count via closure.',
      starterCode:'function makeCounter() {\n  // your code here\n}\nconst counter = makeCounter();\nconsole.log(counter());\nconsole.log(counter());\nconsole.log(counter());',
      expectedOutput:'1\n2\n3',
      validate:(o)=>o.trim()==='1\n2\n3' },

    { id:19, language:'javascript', title:'Deep Clone', difficulty:'Hard', category:'Objects',
      description:'Deep clone {a:1,b:{c:2,d:[3,4]}} and print the cloned b.c value.',
      hint:'Use JSON.parse(JSON.stringify(obj)) or a recursive function.',
      starterCode:'function deepClone(obj) {\n  // your code here\n}\nconst original = {a:1,b:{c:2,d:[3,4]}};\nconst cloned = deepClone(original);\nconsole.log(cloned.b.c);',
      expectedOutput:'2',
      validate:(o)=>o.trim()==='2' },

    { id:20, language:'javascript', title:'Async/Await', difficulty:'Hard', category:'Async',
      description:'Create an async function that returns "done" via Promise. Print the result.',
      hint:'async functions always return a Promise. Use await inside to wait.',
      starterCode:'async function fetchData() {\n  return new Promise(resolve => setTimeout(() => resolve("done"), 1));\n}\nasync function main() {\n  const result = await fetchData();\n  console.log(result);\n}\nmain();',
      expectedOutput:'done',
      validate:(o)=>o.trim()==='done' },

    // ===== PYTHON (17 challenges) =====
    { id:21, language:'python', title:'Hello World', difficulty:'Easy', category:'Basics',
      description:'Print "Hello, World!" to the console.',
      hint:'Use the print() function.',
      starterCode:'# Print Hello, World!\nprint("Hello, World!")',
      expectedOutput:'Hello, World!',
      validate:(o)=>o.trim()==='Hello, World!' },

    { id:22, language:'python', title:'Sum of Two Numbers', difficulty:'Easy', category:'Math',
      description:'Define `sum_two(a, b)` and print sum_two(5, 3).',
      hint:'Use def to define a function. Return a + b.',
      starterCode:'def sum_two(a, b):\n    pass  # your code\n\nprint(sum_two(5, 3))',
      expectedOutput:'8',
      validate:(o)=>o.trim()==='8' },

    { id:23, language:'python', title:'FizzBuzz', difficulty:'Easy', category:'Logic',
      description:'Print FizzBuzz from 1 to 15.',
      hint:'Use range(1, 16) and if-elif-else.',
      starterCode:'for i in range(1, 16):\n    pass  # your code',
      expectedOutput:'1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz',
      validate:(o)=>{ const l=o.trim().split('\n'); const e=['1','2','Fizz','4','Buzz','Fizz','7','8','Fizz','Buzz','11','Fizz','13','14','FizzBuzz']; return JSON.stringify(l)===JSON.stringify(e); } },

    { id:24, language:'python', title:'Reverse String', difficulty:'Easy', category:'Strings',
      description:'Write `reverse_string(s)` and print reverse_string("hello").',
      hint:'Python slicing: s[::-1] reverses a string.',
      starterCode:'def reverse_string(s):\n    pass  # your code\n\nprint(reverse_string("hello"))',
      expectedOutput:'olleh',
      validate:(o)=>o.trim()==='olleh' },

    { id:25, language:'python', title:'Factorial', difficulty:'Easy', category:'Math',
      description:'Write `factorial(n)` and print factorial(5).',
      hint:'Multiply numbers from 1 to n in a loop.',
      starterCode:'def factorial(n):\n    pass  # your code\n\nprint(factorial(5))',
      expectedOutput:'120',
      validate:(o)=>o.trim()==='120' },

    { id:26, language:'python', title:'List Comprehension', difficulty:'Easy', category:'Lists',
      description:'Use list comprehension to create squares of 1-5. Print it.',
      hint:'[x**2 for x in range(1, 6)]',
      starterCode:'squares = []  # replace with list comprehension\nprint(squares)',
      expectedOutput:'[1, 4, 9, 16, 25]',
      validate:(o)=>o.trim()==='[1, 4, 9, 16, 25]' },

    { id:27, language:'python', title:'Dictionary Operations', difficulty:'Medium', category:'Dicts',
      description:'Create dict with name="Alice", age=25, city="Chennai". Print age.',
      hint:'Create dict with {} and access values with dict["key"].',
      starterCode:'person = {}\n# Add keys: name="Alice", age=25, city="Chennai"\n\nprint(person["age"])',
      expectedOutput:'25',
      validate:(o)=>o.trim()==='25' },

    { id:28, language:'python', title:'Find Duplicates', difficulty:'Medium', category:'Lists',
      description:'Write `find_duplicates(lst)` returning sorted duplicates. Print find_duplicates([1,2,3,2,4,3,5]).',
      hint:'Track seen items and duplicates using sets.',
      starterCode:'def find_duplicates(lst):\n    pass  # your code\n\nprint(find_duplicates([1,2,3,2,4,3,5]))',
      expectedOutput:'[2, 3]',
      validate:(o)=>o.trim()==='[2, 3]' },

    { id:29, language:'python', title:'Fibonacci', difficulty:'Medium', category:'Math',
      description:'Write `fibonacci(n)` and print fibonacci(10).',
      hint:'fib(0)=0, fib(1)=1, fib(n)=fib(n-1)+fib(n-2).',
      starterCode:'def fibonacci(n):\n    pass  # your code\n\nprint(fibonacci(10))',
      expectedOutput:'55',
      validate:(o)=>o.trim()==='55' },

    { id:30, language:'python', title:'Anagram Check', difficulty:'Medium', category:'Strings',
      description:'Write `is_anagram(s1, s2)` and print is_anagram("listen","silent").',
      hint:'Sort both strings and compare.',
      starterCode:'def is_anagram(s1, s2):\n    pass  # your code\n\nprint(is_anagram("listen", "silent"))',
      expectedOutput:'True',
      validate:(o)=>o.trim()==='True' },

    { id:31, language:'python', title:'Lambda Sort', difficulty:'Medium', category:'Functional',
      description:'Sort [("b",2),("a",1),("c",3)] by second element using lambda. Print result.',
      hint:'sorted(list, key=lambda x: x[1])',
      starterCode:'data = [("b",2),("a",1),("c",3)]\nresult = []  # sort using lambda\nprint(result)',
      expectedOutput:"[('a', 1), ('b', 2), ('c', 3)]",
      validate:(o)=>o.trim()==="[('a', 1), ('b', 2), ('c', 3)]" },

    { id:32, language:'python', title:'Char Frequency', difficulty:'Medium', category:'Strings',
      description:'Count character frequency in "mississippi". Print count of "s".',
      hint:'Use a dict or Counter to count characters.',
      starterCode:'def char_frequency(s):\n    pass  # your code\n\nfreq = char_frequency("mississippi")\nprint(freq["s"])',
      expectedOutput:'4',
      validate:(o)=>o.trim()==='4' },

    { id:33, language:'python', title:'Class and Objects', difficulty:'Hard', category:'OOP',
      description:'Create `Rectangle` class with area() method. Print Rectangle(4,5).area().',
      hint:'Use __init__ to set self.width and self.height.',
      starterCode:'class Rectangle:\n    def __init__(self, width, height):\n        pass\n    def area(self):\n        pass\n\nr = Rectangle(4, 5)\nprint(r.area())',
      expectedOutput:'20',
      validate:(o)=>o.trim()==='20' },

    { id:34, language:'python', title:'Generator', difficulty:'Hard', category:'Advanced',
      description:'Write generator `countdown(n)` yielding n to 1. Print all from countdown(5).',
      hint:'Use yield in a loop from n down to 1.',
      starterCode:'def countdown(n):\n    pass  # use yield\n\nfor num in countdown(5):\n    print(num)',
      expectedOutput:'5\n4\n3\n2\n1',
      validate:(o)=>o.trim()==='5\n4\n3\n2\n1' },

    { id:35, language:'python', title:'Matrix Transpose', difficulty:'Hard', category:'Math',
      description:'Transpose [[1,2,3],[4,5,6]] and print each row.',
      hint:'Use zip(*matrix) to transpose.',
      starterCode:'def transpose(matrix):\n    pass  # your code\n\nresult = transpose([[1,2,3],[4,5,6]])\nfor row in result:\n    print(row)',
      expectedOutput:'[1, 4]\n[2, 5]\n[3, 6]',
      validate:(o)=>o.trim()==='[1, 4]\n[2, 5]\n[3, 6]' },

    { id:36, language:'python', title:'Decorator', difficulty:'Hard', category:'Advanced',
      description:'Write a decorator `timer` that prints "Executing..." before running. Apply to a func that prints "Done".',
      hint:'A decorator wraps a function. def wrapper(*args): print("Executing..."); func(*args)',
      starterCode:'def timer(func):\n    def wrapper(*args, **kwargs):\n        pass  # print Executing... then call func\n    return wrapper\n\n@timer\ndef my_func():\n    print("Done")\n\nmy_func()',
      expectedOutput:'Executing...\nDone',
      validate:(o)=>o.trim()==='Executing...\nDone' },

    { id:37, language:'python', title:'Tower of Hanoi Moves', difficulty:'Hard', category:'Recursion',
      description:'Print the number of moves for Tower of Hanoi with 3 disks.',
      hint:'Moves = 2^n - 1 where n is disks.',
      starterCode:'def hanoi_moves(n):\n    pass  # return number of moves\n\nprint(hanoi_moves(3))',
      expectedOutput:'7',
      validate:(o)=>o.trim()==='7' },

    // ===== JAVA (13 challenges) =====
    { id:38, language:'java', title:'Hello World', difficulty:'Easy', category:'Basics',
      description:'Print "Hello, World!" using Java.',
      hint:'Use System.out.println() to print output.',
      starterCode:'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
      expectedOutput:'Hello, World!',
      validate:(o)=>o.trim()==='Hello, World!' },

    { id:39, language:'java', title:'Sum of Two Numbers', difficulty:'Easy', category:'Math',
      description:'Create method `sum(int a, int b)` and print sum(5, 3).',
      hint:'Define a static method that returns int.',
      starterCode:'public class Main {\n    static int sum(int a, int b) {\n        return 0; // your code\n    }\n    public static void main(String[] args) {\n        System.out.println(sum(5, 3));\n    }\n}',
      expectedOutput:'8',
      validate:(o)=>o.trim()==='8' },

    { id:40, language:'java', title:'FizzBuzz', difficulty:'Easy', category:'Logic',
      description:'Print FizzBuzz from 1 to 15.',
      hint:'Use a for loop and if-else with % operator.',
      starterCode:'public class Main {\n    public static void main(String[] args) {\n        for (int i = 1; i <= 15; i++) {\n            // your code\n        }\n    }\n}',
      expectedOutput:'1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz',
      validate:(o)=>{ const l=o.trim().split('\n'); const e=['1','2','Fizz','4','Buzz','Fizz','7','8','Fizz','Buzz','11','Fizz','13','14','FizzBuzz']; return JSON.stringify(l)===JSON.stringify(e); } },

    { id:41, language:'java', title:'Factorial', difficulty:'Easy', category:'Math',
      description:'Write `factorial(int n)` and print factorial(5).',
      hint:'Use a loop from 1 to n, multiply result each time.',
      starterCode:'public class Main {\n    static long factorial(int n) {\n        return 1; // your code\n    }\n    public static void main(String[] args) {\n        System.out.println(factorial(5));\n    }\n}',
      expectedOutput:'120',
      validate:(o)=>o.trim()==='120' },

    { id:42, language:'java', title:'Palindrome Check', difficulty:'Easy', category:'Strings',
      description:'Write `isPalindrome(String s)` and print isPalindrome("racecar").',
      hint:'Use StringBuilder.reverse() and compare.',
      starterCode:'public class Main {\n    static boolean isPalindrome(String s) {\n        return false; // your code\n    }\n    public static void main(String[] args) {\n        System.out.println(isPalindrome("racecar"));\n    }\n}',
      expectedOutput:'true',
      validate:(o)=>o.trim()==='true' },

    { id:43, language:'java', title:'Array Maximum', difficulty:'Easy', category:'Arrays',
      description:'Find max in {3,1,4,1,5,9,2,6} and print it.',
      hint:'Loop through array, track max value.',
      starterCode:'public class Main {\n    public static void main(String[] args) {\n        int[] arr = {3,1,4,1,5,9,2,6};\n        int max = arr[0];\n        // find max\n        System.out.println(max);\n    }\n}',
      expectedOutput:'9',
      validate:(o)=>o.trim()==='9' },

    { id:44, language:'java', title:'String Reverse', difficulty:'Easy', category:'Strings',
      description:'Reverse "hello" and print it.',
      hint:'Use StringBuilder sb = new StringBuilder("hello"); sb.reverse();',
      starterCode:'public class Main {\n    public static void main(String[] args) {\n        String s = "hello";\n        // reverse and print\n    }\n}',
      expectedOutput:'olleh',
      validate:(o)=>o.trim()==='olleh' },

    { id:45, language:'java', title:'Fibonacci', difficulty:'Medium', category:'Math',
      description:'Print fibonacci(10) (0-indexed, fib(0)=0, fib(1)=1).',
      hint:'Use two variables to track consecutive Fibonacci numbers.',
      starterCode:'public class Main {\n    static long fibonacci(int n) {\n        return 0; // your code\n    }\n    public static void main(String[] args) {\n        System.out.println(fibonacci(10));\n    }\n}',
      expectedOutput:'55',
      validate:(o)=>o.trim()==='55' },

    { id:46, language:'java', title:'Sum of Digits', difficulty:'Medium', category:'Math',
      description:'Write `sumDigits(int n)` and print sumDigits(12345).',
      hint:'Use % 10 to get last digit, /10 to remove it.',
      starterCode:'public class Main {\n    static int sumDigits(int n) {\n        return 0; // your code\n    }\n    public static void main(String[] args) {\n        System.out.println(sumDigits(12345));\n    }\n}',
      expectedOutput:'15',
      validate:(o)=>o.trim()==='15' },

    { id:47, language:'java', title:'ArrayList Operations', difficulty:'Medium', category:'Collections',
      description:'Create ArrayList, add 1-5, remove 3, print list.',
      hint:'Use ArrayList<Integer>. remove(Integer.valueOf(3)) removes by value.',
      starterCode:'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        ArrayList<Integer> list = new ArrayList<>();\n        // add 1-5, remove 3\n        System.out.println(list);\n    }\n}',
      expectedOutput:'[1, 2, 4, 5]',
      validate:(o)=>o.trim()==='[1, 2, 4, 5]' },

    { id:48, language:'java', title:'HashMap Word Count', difficulty:'Medium', category:'Collections',
      description:'Count words in "the cat sat on the mat". Print count of "the".',
      hint:'Split by space, use HashMap<String,Integer> with getOrDefault.',
      starterCode:'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        String s = "the cat sat on the mat";\n        HashMap<String,Integer> map = new HashMap<>();\n        // count words\n        System.out.println(map.get("the"));\n    }\n}',
      expectedOutput:'2',
      validate:(o)=>o.trim()==='2' },

    { id:49, language:'java', title:'Inheritance & Polymorphism', difficulty:'Hard', category:'OOP',
      description:'Create Shape with area(). Circle extends Shape. Print area of Circle(5) to 2 decimals.',
      hint:'Override area() in Circle. Use Math.PI * r * r. Use printf("%.2f%n", ...).',
      starterCode:'public class Main {\n    static class Shape { double area() { return 0; } }\n    static class Circle extends Shape {\n        double radius;\n        Circle(double r) { this.radius = r; }\n        // override area()\n    }\n    public static void main(String[] args) {\n        Circle c = new Circle(5);\n        System.out.printf("%.2f%n", c.area());\n    }\n}',
      expectedOutput:'78.54',
      validate:(o)=>o.trim()==='78.54' },

    { id:50, language:'java', title:'Bubble Sort', difficulty:'Hard', category:'Algorithms',
      description:'Implement bubble sort on {64,34,25,12,22,11,90} and print sorted array.',
      hint:'Compare adjacent elements and swap if out of order. Repeat n-1 passes.',
      starterCode:'import java.util.Arrays;\npublic class Main {\n    public static void main(String[] args) {\n        int[] arr = {64,34,25,12,22,11,90};\n        // implement bubble sort\n        System.out.println(Arrays.toString(arr));\n    }\n}',
      expectedOutput:'[11, 12, 22, 25, 34, 64, 90]',
      validate:(o)=>o.trim()==='[11, 12, 22, 25, 34, 64, 90]' },
  ];

  findAll() {
    // Strip validate function for API responses
    return this.challenges.map(({ validate, ...c }) => c);
  }

  findOne(id: number) {
    const challenge = this.challenges.find(c => c.id === id);
    if (!challenge) {
      throw new NotFoundException(`Challenge with ID ${id} not found`);
    }
    const { validate, ...safe } = challenge;
    return safe;
  }

  getValidateFunction(id: number) {
    const challenge = this.challenges.find(c => c.id === id);
    return challenge?.validate;
  }
}
