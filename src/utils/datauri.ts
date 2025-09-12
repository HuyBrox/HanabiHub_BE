import DataURIParser from 'datauri/parser';
//import path để lấy đuôi file (thư viện có sẵn trong nodejs)
import path from 'path';

//datauri-parser được import từ thư viện datauri dùng để chuyển đổi file thành base64 để lưu vào database
const parser = new DataURIParser();

interface FileObject {
    originalname: string;
    buffer: Buffer;
}

const getDatUri = (file: FileObject): string | undefined => {
    //lấy đuôi file
    const extName = path.extname(file.originalname).toString();
    //chuyển đổi file thành base64 với tham số đầu tiên là đuôi file, tham số thứ 2 là buffer của file
    return parser.format(extName, file.buffer).content;
}

export default getDatUri;