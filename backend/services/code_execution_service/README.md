# Code Runner Service

This module contains the microservice for running codes. Currently, only Python has automatic code running capabilities if you do not explicitly call any functions.

Given:

```
class Solution:
    def sortSentence(self, theStr: str):
      print("hello world")
```

The code runner will automatically target the `Solution` class and run the **first method**
