const fetch = require('node-fetch'); // try to use built-in fetch if Node >= 18
async function test() {
  try {
    const res = await fetch('http://localhost:3013/api/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test' // Might fail auth, but we want to see if we can reach it
      },
      body: JSON.stringify({
        patient_id: 1,
        professional_id: 1, // Karen? Let's check ID
        start_time: "2026-04-07T20:00:00",
        duration_minutes: 50,
      })
    });
    const text = await res.text();
    console.log(res.status, text);
  } catch (e) {
    console.error(e);
  }
}
test();
