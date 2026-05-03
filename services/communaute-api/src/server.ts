import app from "./app";

const PORT = process.env.PORT || 4003;

app.listen(PORT, () => {
  console.log(`Communauté API running on port ${PORT}`);
});
