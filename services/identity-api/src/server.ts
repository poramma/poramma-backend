import app from "./app";
import { ensureBucket } from "@poramma/storage";

const PORT = process.env.PORT || 4001;

ensureBucket()
  .catch((err) => console.error("Could not ensure MinIO bucket exists (will retry on first upload):", err))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Identity API running on port ${PORT}`);
    });
  });
