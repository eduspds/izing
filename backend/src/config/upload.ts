import path from "path";
import multer from "multer";
import { format } from "date-fns";

const publicFolder = path.resolve(__dirname, "..", "..", "public");
export default {
  directory: publicFolder,

  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, publicFolder);
    },
    filename(req, file, cb) {
      try {
        const { originalname, mimetype } = file;

        // Para áudios e XMLs, manter nome original (já vem com timestamp)
        if (
          mimetype?.toLocaleLowerCase().startsWith("audio/") ||
          mimetype?.toLocaleLowerCase().endsWith("xml")
        ) {
          return cb(null, originalname);
        }

        // Para outros arquivos, adicionar data para evitar conflitos
        const ext = path.extname(originalname);
        const name = originalname.replace(ext, "");
        const date = format(new Date(), "ddMMyyyyHHmmssSSS");
        const fileName = `${name}_${date}${ext}`;

        return cb(null, fileName);
      } catch (error) {
        console.error("Erro no multer filename:", error);
        return cb(error as Error, "");
      }
    }
  })
};
