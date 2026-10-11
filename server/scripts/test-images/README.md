# Test photos for the AI check

Put your own photos here to test how well the AI understands pictures, for example:

- a leaking pipe or tap
- a burnt switch or socket
- a damp or peeling wall
- a broken door lock

Then add a test case in `../ai-test-cases.json` that uses the file name:

```json
{
  "id": 23,
  "text": "eta thik korte hobe",
  "images": ["burnt-socket.jpg"],
  "expect": { "serviceId": "electrician" }
}
```

Cases whose photo is missing are skipped. Do not add photos that show people's faces or house numbers.
