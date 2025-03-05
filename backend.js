import { readFile , writeFile } from 'fs/promises';
import {createServer} from 'http'
import path from 'path';
import crypto from 'crypto' //The crypto module in Node.js is used for cryptographic operations, such as: ✅ Hashing (e.g., SHA-256, MD5) ✅ Encryption & decryption

const DATA_FILE = path.join("data" , "links.json")

const serveFile = async (res,filepath,contentType) => {
    try
    {
        const data = await readFile(filepath);
        res.writeHead(200,{"Content-Type":contentType});
        res.end(data);
    }
    catch(error) {
        res.writeHead(404,{"Content-Type":contentType});
        res.end("404 page not found");
    }
}

const loadlinks = async () => {
    try{
        const data = await readFile(DATA_FILE , 'utf-8' );
        return JSON.parse(data) // The file contents are in JSON format (a string), so we convert it into a JavaScript object using JSON.parse(data).
    } catch (error) {
        if(error.code === "ENOENT")// ENOENT means maybe file not exists
            {
                await writeFile(DATA_FILE, JSON.stringify({}))
                return {};
            }
        throw error; 
    }
}

const saveLinks = async (links) => {
    await writeFile(DATA_FILE, JSON.stringify(links))
}

const server = createServer(async(req,res) => {
    if(req.method === "GET")
    {
        if(req.url === "/")
        {
           return serveFile(res, path.join("public","index.html"), "text/html")
        }

        else if(req.url === "/styles.css")
        {
            return serveFile(res, path.join("public","styles.css"), "text/css")
        }
        //if user req for link and shorten link
        else if(req.url === "/links")
        {
            const links = await loadlinks(); // we created function read links from the file
            res.writeHead(200, {"content-Type" : "application/json"});
            res.end(JSON.stringify(links))
        }

        const links = await loadlinks();
        const shortCode = req.url.slice(1); // Removes the leading "/"

            //checking for link exist or not if exist then it will redirect
            if (shortCode && links[shortCode]) {
                res.writeHead(302, { Location: links[shortCode] });  // Redirect // 302 is http status code for redirection and Location: links[shortCode] sets the redirect destination.
                res.end(); 

            } else {
                if (!res.headersSent) {  // ✅ Prevents multiple responses
                    res.writeHead(404, { "Content-Type": "text/plain" });
                    res.end("Short URL not found.");
                }
            }
    }  

        if(req.method === 'POST' && req.url === '/shorten')
        {
            let body = "";
            req.on("data", (chunk) => 
            {
                body+=chunk;
            })

            req.on("end" , async() => {
                const {url , short} = JSON.parse(body)
                const links = await loadlinks();
                
                if(!url)
                {
                    res.writeHead(400, {"content-Type" : "text/plain"});
                    return res.end("URL is required");
                }

                //to check duplicate
                const finalShortCode = short || crypto.randomBytes(4).toString("hex"); //  Checks if a custom short code (short) was provided.✅ If short is not provided, it generates a random 4-byte hex string using crypto.randomBytes(4).toString("hex").✅ This ensures that every URL gets a unique identifier.
                if(links[finalShortCode])
                {
                    res.writeHead(400, {"content-Type" : "text/plain"});
                    return res.end("Short Code is already existed");
                }

                links[finalShortCode] = url;
                await saveLinks(links)
                res.writeHead(200, {"content-Type" : "application/json"});
                res.end(JSON.stringify({success:true, shortCode:finalShortCode}))
            })
        }
            
    
})
const PORT = process.env.PORT || 3000; // Use Render’s assigned port if available
server.listen(PORT, "0.0.0.0", () => {  
    console.log(`Listening on PORT ${PORT}`);
});
