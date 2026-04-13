<?php
// Project Root Landing Page - iMatchBook
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>iMatchBook | Smart Reconciliation</title>
    <!-- Modern Typography: Outfit -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #6366f1;
            --primary-glow: rgba(99, 102, 241, 0.4);
            --secondary: #8b5cf6;
            --bg: #0f172a;
            --card-bg: rgba(30, 41, 59, 0.7);
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --glass-border: rgba(255, 255, 255, 0.1);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Outfit', sans-serif;
            background-color: var(--bg);
            background-image: 
                radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 40%),
                radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 40%);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow-x: hidden;
        }

        .container {
            max-width: 1000px;
            width: 90%;
            text-align: center;
            z-index: 10;
        }

        .hero-card {
            background: var(--card-bg);
            backdrop-filter: blur(12px);
            border: 1px solid var(--glass-border);
            border-radius: 24px;
            padding: 4rem 2rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            animation: fadeIn 1s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .logo-container {
            margin-bottom: 2rem;
            position: relative;
            display: inline-block;
        }

        .logo-icon {
            font-size: 3.5rem;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: 800;
            letter-spacing: -2px;
        }

        .badge {
            position: absolute;
            top: -10px;
            right: -40px;
            background: var(--primary);
            color: white;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            box-shadow: 0 0 15px var(--primary-glow);
        }

        h1 {
            font-size: clamp(2.5rem, 8vw, 4rem);
            font-weight: 800;
            line-height: 1.1;
            margin-bottom: 1.5rem;
            background: linear-gradient(to right, #fff, #94a3b8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        p.tagline {
            font-size: 1.2rem;
            color: var(--text-muted);
            max-width: 600px;
            margin: 0 auto 3rem;
            line-height: 1.6;
        }

        .action-group {
            display: flex;
            flex-wrap: wrap;
            gap: 1.5rem;
            justify-content: center;
        }

        .btn {
            text-decoration: none;
            padding: 1rem 2.5rem;
            border-radius: 12px;
            font-weight: 600;
            font-size: 1.1rem;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: inline-flex;
            align-items: center;
            gap: 0.75rem;
        }

        .btn-primary {
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            color: white;
            box-shadow: 0 10px 20px -5px var(--primary-glow);
        }

        .btn-primary:hover {
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 20px 30px -5px var(--primary-glow);
        }

        .btn-secondary {
            background: rgba(255, 255, 255, 0.05);
            color: #fff;
            border: 1px solid var(--glass-border);
        }

        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: translateY(-3px);
        }

        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 2rem;
            margin-top: 4rem;
            text-align: left;
        }

        .feature-item h3 {
            font-size: 1.1rem;
            margin-bottom: 0.5rem;
            color: #fff;
        }

        .feature-item p {
            font-size: 0.9rem;
            color: var(--text-muted);
        }

        .blob {
            position: absolute;
            width: 400px;
            height: 400px;
            background: var(--primary);
            filter: blur(100px);
            opacity: 0.1;
            z-index: -1;
            border-radius: 50%;
        }

        .api-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 6px 12px;
            background: rgba(34, 197, 94, 0.1);
            color: #4ade80;
            border-radius: 99px;
            font-size: 0.8rem;
            font-weight: 600;
            margin-top: 2rem;
        }

        .dot {
            width: 8px;
            height: 8px;
            background: currentColor;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { opacity: 0.4; }
            50% { opacity: 1; }
            100% { opacity: 0.4; }
        }
    </style>
</head>
<body>
    <div class="blob" style="top: 10%; left: 10%;"></div>
    <div class="blob" style="bottom: 10%; right: 10%;"></div>

    <div class="container">
        <div class="hero-card">
            <div class="logo-container">
                <div class="logo-icon">iMB</div>
                <div class="badge">v1.0</div>
            </div>

            <h1>Automate your <br> reconciliation.</h1>
            <p class="tagline">
                Match physical receipts with bank transactions in seconds using Google's powerful AI engines.
            </p>

            <div class="action-group">
                <a href="/frontend/dist/index.html" class="btn btn-primary">
                    Launch Dashboard
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </a>
                <a href="/.guide/project_overview_guide.html" class="btn btn-secondary">
                    Read Doc Preview
                </a>
            </div>

            <div class="features-grid">
                <div class="feature-item">
                    <h3>AI Capture</h3>
                    <p>Google Document AI extracts line items, totals, and merchant names with high precision.</p>
                </div>
                <div class="feature-item">
                    <h3>Smart Match</h3>
                    <p>Automated proximity matching logic finds likely transactions across multiple bank formats.</p>
                </div>
                <div class="feature-item">
                    <h3>Dynamic Import</h3>
                    <p>Flexible CSV column mapping detects headers automatically for seamless bank rotation.</p>
                </div>
            </div>

            <div class="api-badge">
                <div class="dot"></div>
                API Services Operational
            </div>
        </div>
    </div>
</body>
</html>
