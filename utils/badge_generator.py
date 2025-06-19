

class BadgeGenerator:
    """Generate SVG badges for coverage display"""
    
    def __init__(self):
        pass
    
    def generate_coverage_badge(self, coverage_percentage: float) -> str:
        """Generate an SVG badge showing coverage percentage"""
        
        # Determine color based on coverage percentage
        if coverage_percentage >= 90:
            color = '#4c1'  # Bright green
        elif coverage_percentage >= 80:
            color = '#97ca00'  # Green
        elif coverage_percentage >= 70:
            color = '#a4a61d'  # Yellow-green
        elif coverage_percentage >= 60:
            color = '#dfb317'  # Yellow
        elif coverage_percentage >= 50:
            color = '#fe7d37'  # Orange
        else:
            color = '#e05d44'  # Red
        
        # Format percentage
        coverage_text = f"{coverage_percentage:.1f}%"
        
        # Calculate text widths (approximate)
        label_width = 59  # "coverage" text width
        value_width = len(coverage_text) * 7 + 10  # approximate width
        total_width = label_width + value_width
        
        svg_template = f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{total_width}" height="20">
<linearGradient id="b" x2="0" y2="100%">
<stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
<stop offset="1" stop-opacity=".1"/>
</linearGradient>
<clipPath id="a">
<rect width="{total_width}" height="20" rx="3" fill="#fff"/>
</clipPath>
<g clip-path="url(#a)">
<path fill="#555" d="M0 0h{label_width}v20H0z"/>
<path fill="{color}" d="M{label_width} 0h{value_width}v20H{label_width}z"/>
<path fill="url(#b)" d="M0 0h{total_width}v20H0z"/>
</g>
<g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="110">
<text x="{label_width//2 + 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="490">coverage</text>
<text x="{label_width//2 + 10}" y="140" transform="scale(.1)" textLength="490">coverage</text>
<text x="{label_width + value_width//2 - 5}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="{(len(coverage_text)-1) * 70}">{coverage_text}</text>
<text x="{label_width + value_width//2 - 5}" y="140" transform="scale(.1)" textLength="{(len(coverage_text)-1) * 70}">{coverage_text}</text>
</g>
</svg>'''
        
        return svg_template
    
    def generate_build_badge(self, status: str) -> str:
        """Generate an SVG badge showing build status"""
        
        # Determine color based on status
        status_colors = {
            'passing': '#4c1',
            'failing': '#e05d44',
            'error': '#e05d44',
            'pending': '#dfb317',
            'unknown': '#9f9f9f'
        }
        
        color = status_colors.get(status.lower(), '#9f9f9f')
        
        # Calculate text widths
        label_width = 37  # "build" text width
        value_width = len(status) * 7 + 10
        total_width = label_width + value_width
        
        svg_template = f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{total_width}" height="20">
<linearGradient id="b" x2="0" y2="100%">
<stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
<stop offset="1" stop-opacity=".1"/>
</linearGradient>
<clipPath id="a">
<rect width="{total_width}" height="20" rx="3" fill="#fff"/>
</clipPath>
<g clip-path="url(#a)">
<path fill="#555" d="M0 0h{label_width}v20H0z"/>
<path fill="{color}" d="M{label_width} 0h{value_width}v20H{label_width}z"/>
<path fill="url(#b)" d="M0 0h{total_width}v20H0z"/>
</g>
<g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="110">
<text x="{label_width//2 + 5}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="270">build</text>
<text x="{label_width//2 + 5}" y="140" transform="scale(.1)" textLength="270">build</text>
<text x="{label_width + value_width//2 - 5}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="{(len(status)-1) * 70}">{status}</text>
<text x="{label_width + value_width//2 - 5}" y="140" transform="scale(.1)" textLength="{(len(status)-1) * 70}">{status}</text>
</g>
</svg>'''
        
        return svg_template
