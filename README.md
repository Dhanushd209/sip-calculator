# 💰 SIP Calculator Pro

A comprehensive, feature-rich Systematic Investment Plan (SIP) calculator designed for the Indian market. Calculate your mutual fund returns with advanced features like step-up SIP, inflation adjustment, tax calculations, and more.

![SIP Calculator](https://img.shields.io/badge/Status-Active-success)
![License](https://img.shields.io/badge/License-MIT-blue)
![Made with](https://img.shields.io/badge/Made%20with-HTML%2FCSS%2FJS-orange)

## 🌟 Features

### Core Functionality
- **Dual Calculator Modes**: Forward (SIP → Corpus) and Reverse (Goal → Required SIP)
- **Flexible SIP Parameters**: Adjust monthly amount, duration (1-40 years), and expected returns
- **Multiple Frequencies**: Monthly, Quarterly, and Bi-monthly SIP options
- **Step-up SIP**: Annual increment feature to align with salary growth
- **Lump Sum Addition**: Factor in one-time investments
- **Inflation Adjustment**: Calculate real returns after inflation

### Advanced Analytics
- **Comprehensive Results**: Total invested, expected corpus, gains, and wealth multiplier
- **CAGR Calculation**: Accurate compound annual growth rate
- **Tax Calculations**: India-specific tax treatment for Equity, Debt, and Hybrid funds
- **Scenario Comparison**: Compare Conservative (8%), Moderate (12%), and Aggressive (15%) scenarios
- **Goal-based Planning**: Preset goals for House, Car, Retirement, and Education

### Visualizations
- **Interactive Charts**: Bar, Line, and Pie chart options with hover details
- **Year-wise Breakdown**: Detailed tabular view of investment growth
- **Real-time Updates**: Instant recalculation as you adjust parameters
- **Dark/Light Mode**: Eye-friendly theme switching

### Export Options
- **PDF Reports**: Download professional investment reports
- **Excel Export**: Get detailed breakdowns in spreadsheet format
- **Share Links**: Generate shareable URLs with your parameters
- **Print Support**: Optimized print layout

## 🚀 Live Demo

[View Live Demo](https://yourusername.github.io/sip-calculator)

## 📸 Screenshots

### Light Mode
![Light Mode Screenshot](screenshots/light-mode.png)

### Dark Mode
![Dark Mode Screenshot](screenshots/dark-mode.png)

## 🛠️ Installation

### Option 1: GitHub Pages (Recommended)

1. **Fork this repository**
   - Click the "Fork" button at the top right of this page

2. **Enable GitHub Pages**
   - Go to your forked repository
   - Click on "Settings"
   - Scroll down to "Pages" section
   - Under "Source", select "main" branch
   - Click "Save"

3. **Access your calculator**
   - Your calculator will be live at: `https://yourusername.github.io/sip-calculator`

### Option 2: Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/sip-calculator.git
   cd sip-calculator
   ```

2. **Open in browser**
   - Simply open `index.html` in your web browser
   - No server required - runs entirely in the browser!

### Option 3: Download ZIP

1. Click the green "Code" button
2. Select "Download ZIP"
3. Extract the files
4. Open `index.html` in your browser

## 📁 Project Structure

```
sip-calculator/
│
├── index.html          # Main HTML structure
├── style.css           # All styles and themes
├── script.js           # JavaScript functionality
├── README.md           # Documentation (you are here!)
└── screenshots/        # Demo screenshots (optional)
```

## 💡 Usage

1. **Select Calculator Mode**
   - Forward: Calculate corpus from SIP amount
   - Reverse: Calculate required SIP from target corpus

2. **Enter Investment Parameters**
   - Monthly SIP amount or target corpus
   - Investment duration (years)
   - Expected annual return rate
   - SIP frequency

3. **Configure Advanced Options** (Optional)
   - Enable step-up SIP with annual increase %
   - Add lump sum amount
   - Adjust for inflation
   - Select fund type for tax calculations
   - Choose investment goal

4. **View Results**
   - See detailed investment summary
   - Explore interactive charts
   - Review year-wise breakdown
   - Compare different scenarios

5. **Export & Share**
   - Download PDF report
   - Export to Excel
   - Share via link
   - Print summary

## 🎨 Customization

### Changing Colors

Edit the CSS variables in `style.css`:

```css
:root {
    --primary: #0066FF;        /* Primary brand color */
    --secondary: #00D4AA;      /* Secondary accent color */
    --background: #FFFFFF;     /* Background color */
    /* ... more variables ... */
}
```

### Modifying Default Values

Edit the HTML in `index.html`:

```html
<input type="range" id="sipAmount" min="500" max="100000" value="5000">
```

### Adding New Features

The code is well-commented and organized:
- **HTML**: Semantic structure with clear sections
- **CSS**: Organized by component with media queries
- **JavaScript**: Modular functions with clear comments

## 📊 Calculation Methodology

### Future Value Formula
```
FV = P × [(1 + r)^n - 1] / r × (1 + r)
```

Where:
- **FV** = Future Value (corpus at maturity)
- **P** = Monthly SIP amount
- **r** = Monthly rate of return (Annual rate / 12)
- **n** = Total number of months

### CAGR Formula
```
CAGR = [(Final Value / Initial Value)^(1/Years)] - 1
```

### Tax Calculations (India)

**Equity Funds:**
- Long Term Capital Gains (>1 year): 12.5% on gains above ₹1.25 lakh
- Short Term Capital Gains (≤1 year): 20%

**Debt Funds:**
- Taxed as per income tax slab
- No indexation benefit from April 2023

## ⚠️ Disclaimer

This calculator provides estimates based on your inputs and assumptions. Actual investment returns may vary significantly due to market conditions. Past performance does not guarantee future results. Please consult a SEBI registered financial advisor before making investment decisions. This tool is for educational purposes only and does not constitute financial advice.

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Ideas for Contributions
- Monte Carlo simulation for probabilistic outcomes
- Market crash scenario testing
- Historical return data integration
- Multi-currency support
- SWP (Systematic Withdrawal Plan) calculator
- Portfolio rebalancing suggestions
- Mobile app version

## 📝 License

This project is licensed under the MIT License - see below for details:

```
MIT License

Copyright (c) 2025 [Your Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🙏 Acknowledgments

- Chart visualization powered by [Chart.js](https://www.chartjs.org/)
- PDF generation using [jsPDF](https://github.com/parallax/jsPDF)
- Excel export using [SheetJS](https://sheetjs.com/)
- Fonts from [Google Fonts](https://fonts.google.com/)

## 📧 Contact

Have questions or suggestions? Feel free to:
- Open an issue on GitHub
- Submit a pull request
- Star this repository if you find it useful!

## 🌟 Star History

If you found this project helpful, please consider giving it a star! ⭐

---

**Made with ❤️ for Indian investors**

**Last Updated**: January 2025