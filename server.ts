import express from "express";
import cors from "cors";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable CORS
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Route to proxy Google Sheets Auth (CORS workaround)
  app.post("/api/auth/sheets", async (req, res) => {
    const { email, password } = req.body;
    const SHEET_AUTH_CSV_URL = 'https://docs.google.com/spreadsheets/d/1YR75Z4MPxn37PYy2YVimjJXXU1bPflEigEMRU6kgSiE/export?format=csv&gid=1919881010';
    
    try {
      console.log(`[API] Authenticating ${email} via Sheet CSV`);
      
      const response = await fetch(SHEET_AUTH_CSV_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Sheet fetch failed: ${response.status}`);
      }
      
      const csvText = await response.text();
      const rows = csvText.split(/\r?\n/).filter(line => line.trim() !== "");
      
      let authenticated = false;
      
      // Iterate through rows
      for (const row of rows) {
        // Handle basic CSV splitting with potential quotes
        const cols = row.split(',').map(cell => cell.replace(/^["']|["']$/g, '').trim());
        
        // Column A: Email (index 0), Column B: Password (index 1)
        if (cols.length >= 2) {
          const sheetEmail = cols[0];
          const sheetPassword = cols[1];
          
          if (sheetEmail === email && sheetPassword === password) {
            authenticated = true;
            break;
          }
        }
      }

      if (authenticated) {
        res.json({ status: 'success' });
      } else {
        res.json({ 
          status: 'error', 
          message: "الإيميل أو كلمة المرور غير صحيحة. يرجى التأكد من البيانات والمحاولة مرة أخرى." 
        });
      }
    } catch (error) {
      console.error("[API Error] Sheets Auth failed:", error);
      res.status(500).json({ 
        status: 'error', 
        message: "حدث خطأ فني أثناء التحقق من البيانات. تأكد من أن الشيت متاح للعرض (Anyone with the link can view)." 
      });
    }
  });

  // API Route to fetch poultry price
  app.get("/api/poultry-price", async (req, res) => {
    console.log(`[API] Fetching poultry price from ${req.ip}`);
    res.setHeader('Content-Type', 'application/json');
    try {
      const sources = [
        'https://www.biltafsil.com/poultry/',
        'https://www.biltafsil.com/poultry/chickens/',
        'https://misr365.com/price/chickens-price-today/',
        'https://sarery.com/bourse-poultry/',
        'https://www.elwatannews.com/category/37',
        'https://www.masrawy.com/news/news_economy/',
        'https://www.cairo24.com/section/167/Economy',
        'https://vetogate.com/section/168/Economy',
        'https://www.elbalad.news/category/168'
      ];
      
      const patterns = [
        /البيضاء.*?<td>(\d+)/i,
        /اللحم الأبيض.*?<td>(\d+)/i,
        /البيضاء اليوم.*?(\d+)/,
        /سعر الفراخ البيضاء اليوم.*?(\d+)/,
        /لحم الفراخ البيضاء\s*<\/td>\s*<td>\s*(\d+)/i,
        /الفراخ البيضاء\s*<\/td>\s*<td>\s*(\d+)/i,
        /اللحم الأبيض\s*<\/td>\s*<td>\s*(\d+)/i,
        /الفراخ البيضاء\s*:\s*(\d+)/,
        /البيضاء\s*:\s*(\d+)/,
        /الفراخ البيضاء [^<]{0,100}? (\d+)/i,
        /(\d+)\s*جنيه\s*<\/td>/,
        /(\d+)\s*<\/span>\s*جنيه/,
        /بلغ سعر.*?(\d+)\s*جنيه/,
        /<td>(\d+)<\/td>\s*<td>لحم فني/,
        /"price":\s*"?(\d+)"?/,
        /value">(\d+)<\/span>/,
        /(\d+)\s*جنيه/ 
      ];

      // Use a shorter timeout per request and try everything in parallel
      const fetchWithTimeout = async (url: string) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        try {
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
              'Accept-Language': 'ar-EG,ar;q=0.9,en-US;q=0.8,en;q=0.7',
              'Cache-Control': 'no-cache',
              'Referer': 'https://www.google.com/'
            },
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (!response.ok) return null;
          const html = await response.text();
          
          for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
              const parsed = parseInt(match[1]);
              if (parsed >= 50 && parsed <= 150) { 
                return { price: parsed, source: url };
              }
            }
          }
        } catch (e) {
          // Ignore individual failures
        } finally {
          clearTimeout(timeoutId);
        }
        return null;
      };

      // Try top 4 sources in parallel first
      const results = await Promise.all(sources.slice(0, 4).map(fetchWithTimeout));
      const successfulResult = results.find(r => r !== null);
      
      if (successfulResult) {
        return res.json(successfulResult);
      }

      // If top 4 fail, try the rest
      const remainingResults = await Promise.all(sources.slice(4).map(fetchWithTimeout));
      const remainingSuccessfulResult = remainingResults.find(r => r !== null);

      if (remainingSuccessfulResult) {
        return res.json(remainingSuccessfulResult);
      }

      res.status(404).json({ error: "Poultry price not found" });
    } catch (error) {
      console.error("[API Error] Poultry price fetch failed:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API Route to fetch market data from Google Sheet
  app.get("/api/market-sheet", async (req, res) => {
    try {
      const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1sa3dTT3ID0PmRVyfy2B-JA4F7-m3cW8HhTX0JBspzKg/export?format=csv&gid=0';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(SHEET_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`Sheet fetch failed with status: ${response.status}`);
      const csvData = await response.text();
      res.send(csvData);
    } catch (error) {
      console.error("Market sheet error:", error);
      res.status(500).json({ error: "Failed to fetch market sheet", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // API Route to fetch currency rates
  app.get("/api/currency-rates", async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!response.ok) throw new Error('Currency API failed');
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Currency rate error:", error);
      res.status(500).json({ error: "Failed to fetch currency rates" });
    }
  });

  // API Route to fetch gold price
  app.get("/api/gold-price", async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const sources = [
        'https://isagha.com/ar/gold-prices/egypt',
        'https://isagha.com/en/gold-prices/egypt',
        'https://isagha.com/ar/',
        'https://isagha.com/',
        'https://goldpricesegypt.com/',
        'https://www.goldpricesegypt.com/',
        'https://misr365.com/price/gold-price-today/'
      ];

      const patterns21k = [
        /عيار 21.*?(\d{3,4})/,
        /21k.*?(\d{3,4})/,
        /Gold 21K.*?(\d{4})/,
        /<span>21<\/span>.*?<span>(\d{4})<\/span>/,
        /سعر عيار 21 اليوم\s*:\s*(\d{4})/,
        /(\d{4})\s*جنيه لعيار 21/,
        /(\d{4})\s*جنيه لـ١ جرام ذهب عيار ٢١/,
        /"(21k|gold_21)":\s*"?(\d{4})"?/,
        /price-21">(\d{4})/,
        /price_21k">(\d{4})/,
        /class="gold-price">(\d{4})/,
        /<td>21k<\/td>.*?<td>(\d{4})<\/td>/i,
        /<td>(\d{4})<\/td>.*?<td>21k<\/td>/i
      ];

      const fetchGoldWithTimeout = async (url: string) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        try {
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
              'Accept-Language': 'ar-EG,ar;q=0.9,en-US;q=0.8,en;q=0.7',
              'Cache-Control': 'no-cache',
              'Referer': 'https://www.google.com/'
            },
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (!response.ok) return null;
          const html = await response.text();
          
          for (const pattern of patterns21k) {
            const match = html.match(pattern);
            if (match && match[1]) {
              const p21 = parseInt(match[1]);
              if (p21 >= 2000 && p21 <= 10000) {
                return {
                   prices: {
                     '21k': p21,
                     '24k': Math.round(p21 * (24/21)),
                     '18k': Math.round(p21 * (18/21))
                   },
                   source: url
                };
              }
            }
          }
        } catch (e) {
          // Ignore
        } finally {
          clearTimeout(timeoutId);
        }
        return null;
      };

      const results = await Promise.all(sources.slice(0, 3).map(fetchGoldWithTimeout));
      const successfulResult = results.find(r => r !== null);
      
      if (successfulResult) {
        return res.json(successfulResult);
      }

      const remainingResults = await Promise.all(sources.slice(3).map(fetchGoldWithTimeout));
      const remainingSuccessfulResult = remainingResults.find(r => r !== null);

      if (remainingSuccessfulResult) {
        return res.json(remainingSuccessfulResult);
      }

      res.json({ 
        prices: { '21k': 6900, '24k': 7886, '18k': 5914 }, 
        source: "fallback"
      });
    } catch (error) {
      console.error("[API Error] Gold price fetch failed:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Catch-all for unknown API routes
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.originalUrl}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
