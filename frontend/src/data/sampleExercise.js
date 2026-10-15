// Offline fallback so the UI works before the backend serves /exercises.
// Shape mirrors exercises/loop_exercise.json.
export const SAMPLE_EXERCISES = [
  {
    id: 'loop-01-sum-to-n',
    title: 'Sum of 1 to n',
    category: 'Loop',
    difficulty: 'novice',
    description:
      'Write a program that reads a positive integer n and prints the sum of all integers from 1 to n (inclusive). Example: n = 5 prints 15.',
    starter_code:
      '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cout << "Enter n: ";\n    cin >> n;\n\n    int sum = 0;\n    for (int i = 1; i < n; i++) {\n        sum += i;\n    }\n\n    cout << "Sum: " << sum << endl;\n    return 0;\n}\n',
    sample_input: '5\n',
    checkpoints: [
      { id: 'cp1', line: 13, prediction_prompt: 'How many times do you think the body of this loop will run?', answer_type: 'integer' },
      { id: 'cp2', line: 14, prediction_prompt: 'What value do you think sum will hold at this point?', answer_type: 'integer' },
    ],
  },
  {
    id: 'function-01-cube',
    title: 'Cube of a number',
    category: 'Function',
    difficulty: 'novice',
    description:
      'Write a program that reads an integer n, uses the function cube() to compute n*n*n, and prints the result. Example: 4 prints 64.',
    starter_code:
      '#include <iostream>\nusing namespace std;\n\nint cube(int x) {\n    int result = x * x * x;\n    return result;\n}\n\nint main() {\n    int n;\n    cout << "Enter a number: ";\n    cin >> n;\n\n    int answer = 0;\n    cube(n);\n\n    cout << "Cube: " << answer << endl;\n    return 0;\n}\n',
    sample_input: '4\n',
    checkpoints: [
      { id: 'cp2', line: 16, prediction_prompt: 'What value do you think answer holds after cube(n) has been called?', answer_type: 'integer' },
    ],
  },
  {
    id: 'computation-01-average-of-three',
    title: 'Average of three scores',
    category: 'Computation',
    difficulty: 'novice',
    description:
      'Write a program that reads three integer scores and prints their average rounded to 2 decimal places. Example: 7 8 8 prints 7.67.',
    starter_code:
      '#include <iostream>\n#include <iomanip>\nusing namespace std;\n\nint main() {\n    int a, b, c;\n    cout << "Enter three scores: ";\n    cin >> a >> b >> c;\n\n    int total = a + b + c;\n    double average = total / 3;\n\n    cout << fixed << setprecision(2);\n    cout << "Average: " << average << endl;\n    return 0;\n}\n',
    sample_input: '7 8 8\n',
    checkpoints: [
      { id: 'cp2', line: 12, prediction_prompt: 'What value do you think average will hold after the division on the previous line?', answer_type: 'decimal' },
    ],
  },
]
