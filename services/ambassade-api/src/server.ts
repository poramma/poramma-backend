import app from "./app";
import { ensureBucket } from "@poramma/storage";
import { startCampagneScheduler } from "./modules/communication/communication.service";

const PORT = process.env.PORT || 4002;

ensureBucket()
  .catch((err) => console.error("Could not ensure MinIO bucket exists (will retry on first upload):", err))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Ambassade API running on port ${PORT}`);
      startCampagneScheduler();
    });
  });
