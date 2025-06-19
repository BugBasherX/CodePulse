import xml.etree.ElementTree as ET
import re
from typing import Dict, List, Optional, Any
import logging

class CoverageParser:
    """Parser for various coverage report formats"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def parse_file(self, file) -> Optional[Dict[str, Any]]:
        """
        Parse a coverage file and return normalized coverage data
        Supports: coverage.xml, cobertura.xml, lcov.info, jacoco.xml
        """
        try:
            # Reset file pointer
            file.seek(0)
            content = file.read()
            
            # Try to decode as text
            if isinstance(content, bytes):
                content = content.decode('utf-8')
            
            filename = getattr(file, 'filename', '').lower()
            
            # Determine format and parse
            if filename.endswith('.xml') or '<coverage' in content or '<report' in content:
                return self._parse_xml_coverage(content)
            elif filename.endswith('.info') or filename.startswith('lcov') or 'TN:' in content:
                return self._parse_lcov(content)
            else:
                # Try XML first, then LCOV
                xml_result = self._parse_xml_coverage(content)
                if xml_result:
                    return xml_result
                return self._parse_lcov(content)
                
        except Exception as e:
            self.logger.error(f"Error parsing coverage file: {e}")
            return None
    
    def _parse_xml_coverage(self, content: str) -> Optional[Dict[str, Any]]:
        """Parse XML-based coverage formats (coverage.xml, cobertura.xml, jacoco.xml)"""
        try:
            root = ET.fromstring(content)
            
            # Detect format based on root element and attributes
            if root.tag == 'coverage' or 'cobertura' in root.attrib.get('dtd', '').lower():
                return self._parse_cobertura_xml(root)
            elif root.tag == 'report':
                return self._parse_jacoco_xml(root)
            else:
                # Try generic XML parsing
                return self._parse_generic_xml(root)
                
        except ET.ParseError as e:
            self.logger.error(f"XML parsing error: {e}")
            return None
    
    def _parse_cobertura_xml(self, root: ET.Element) -> Dict[str, Any]:
        """Parse Cobertura XML format"""
        coverage_data = {
            'format': 'cobertura',
            'overall': {
                'lines_covered': 0,
                'lines_total': 0,
                'branches_covered': 0,
                'branches_total': 0,
                'coverage_percentage': 0.0
            },
            'files': []
        }
        
        # Get overall metrics
        overall_lines = int(root.attrib.get('lines-valid', 0))
        overall_covered = int(root.attrib.get('lines-covered', 0))
        overall_branches = int(root.attrib.get('branches-valid', 0))
        overall_branches_covered = int(root.attrib.get('branches-covered', 0))
        
        coverage_data['overall']['lines_total'] = overall_lines
        coverage_data['overall']['lines_covered'] = overall_covered
        coverage_data['overall']['branches_total'] = overall_branches
        coverage_data['overall']['branches_covered'] = overall_branches_covered
        
        if overall_lines > 0:
            coverage_data['overall']['coverage_percentage'] = round((overall_covered / overall_lines) * 100, 2)
        
        # Parse packages and classes
        for package in root.findall('.//package'):
            for class_elem in package.findall('.//class'):
                filename = class_elem.attrib.get('filename', '')
                if not filename:
                    continue
                
                # Get class metrics
                lines = class_elem.findall('.//line')
                lines_total = len(lines)
                lines_covered = len([line for line in lines if int(line.attrib.get('hits', 0)) > 0])
                
                file_coverage_percentage = 0.0
                if lines_total > 0:
                    file_coverage_percentage = round((lines_covered / lines_total) * 100, 2)
                
                # Build line coverage data
                line_coverage = {}
                for line in lines:
                    line_num = int(line.attrib.get('number', 0))
                    hits = int(line.attrib.get('hits', 0))
                    line_coverage[str(line_num)] = hits > 0
                
                coverage_data['files'].append({
                    'path': filename,
                    'coverage_percentage': file_coverage_percentage,
                    'lines_covered': lines_covered,
                    'lines_total': lines_total,
                    'line_coverage': line_coverage
                })
        
        return coverage_data
    
    def _parse_jacoco_xml(self, root: ET.Element) -> Dict[str, Any]:
        """Parse JaCoCo XML format"""
        coverage_data = {
            'format': 'jacoco',
            'overall': {
                'lines_covered': 0,
                'lines_total': 0,
                'branches_covered': 0,
                'branches_total': 0,
                'coverage_percentage': 0.0
            },
            'files': []
        }
        
        total_lines_covered = 0
        total_lines_total = 0
        
        # Parse packages and source files
        for package in root.findall('.//package'):
            for sourcefile in package.findall('.//sourcefile'):
                filename = sourcefile.attrib.get('name', '')
                if not filename:
                    continue
                
                # Build full path
                package_name = package.attrib.get('name', '').replace('/', '/')
                if package_name:
                    filename = package_name + '/' + filename
                
                # Count line coverage
                lines = sourcefile.findall('.//line')
                lines_total = len(lines)
                lines_covered = len([line for line in lines if int(line.attrib.get('ci', 0)) > 0])
                
                total_lines_total += lines_total
                total_lines_covered += lines_covered
                
                file_coverage_percentage = 0.0
                if lines_total > 0:
                    file_coverage_percentage = round((lines_covered / lines_total) * 100, 2)
                
                # Build line coverage data
                line_coverage = {}
                for line in lines:
                    line_num = int(line.attrib.get('nr', 0))
                    covered_instructions = int(line.attrib.get('ci', 0))
                    line_coverage[str(line_num)] = covered_instructions > 0
                
                coverage_data['files'].append({
                    'path': filename,
                    'coverage_percentage': file_coverage_percentage,
                    'lines_covered': lines_covered,
                    'lines_total': lines_total,
                    'line_coverage': line_coverage
                })
        
        # Calculate overall coverage
        coverage_data['overall']['lines_total'] = total_lines_total
        coverage_data['overall']['lines_covered'] = total_lines_covered
        
        if total_lines_total > 0:
            coverage_data['overall']['coverage_percentage'] = round((total_lines_covered / total_lines_total) * 100, 2)
        
        return coverage_data
    
    def _parse_generic_xml(self, root: ET.Element) -> Dict[str, Any]:
        """Parse generic XML coverage format"""
        coverage_data = {
            'format': 'generic_xml',
            'overall': {
                'lines_covered': 0,
                'lines_total': 0,
                'coverage_percentage': 0.0
            },
            'files': []
        }
        
        # Try to extract coverage information from various XML structures
        # This is a fallback parser for unknown XML formats
        
        return coverage_data
    
    def _parse_lcov(self, content: str) -> Optional[Dict[str, Any]]:
        """Parse LCOV format (.info files)"""
        try:
            coverage_data = {
                'format': 'lcov',
                'overall': {
                    'lines_covered': 0,
                    'lines_total': 0,
                    'functions_covered': 0,
                    'functions_total': 0,
                    'branches_covered': 0,
                    'branches_total': 0,
                    'coverage_percentage': 0.0
                },
                'files': []
            }
            
            current_file = None
            total_lines_covered = 0
            total_lines_total = 0
            
            for line in content.split('\n'):
                line = line.strip()
                
                if line.startswith('SF:'):
                    # Source file
                    if current_file:
                        coverage_data['files'].append(current_file)
                    
                    filename = line[3:].strip()
                    current_file = {
                        'path': filename,
                        'coverage_percentage': 0.0,
                        'lines_covered': 0,
                        'lines_total': 0,
                        'functions_covered': 0,
                        'functions_total': 0,
                        'line_coverage': {}
                    }
                
                elif line.startswith('DA:') and current_file:
                    # Line data: DA:line_number,hit_count
                    parts = line[3:].split(',')
                    if len(parts) >= 2:
                        line_num = parts[0].strip()
                        hit_count = int(parts[1].strip())
                        current_file['line_coverage'][line_num] = hit_count > 0
                        current_file['lines_total'] += 1
                        if hit_count > 0:
                            current_file['lines_covered'] += 1
                
                elif line.startswith('LH:') and current_file:
                    # Lines hit
                    current_file['lines_covered'] = int(line[3:].strip())
                
                elif line.startswith('LF:') and current_file:
                    # Lines found
                    current_file['lines_total'] = int(line[3:].strip())
                
                elif line.startswith('FNH:') and current_file:
                    # Functions hit
                    current_file['functions_covered'] = int(line[4:].strip())
                
                elif line.startswith('FNF:') and current_file:
                    # Functions found
                    current_file['functions_total'] = int(line[4:].strip())
                
                elif line.startswith('BRH:') and current_file:
                    # Branches hit
                    current_file['branches_covered'] = int(line[4:].strip())
                
                elif line.startswith('BRF:') and current_file:
                    # Branches found
                    current_file['branches_total'] = int(line[4:].strip())
                
                elif line == 'end_of_record' and current_file:
                    # Calculate file coverage percentage
                    if current_file['lines_total'] > 0:
                        current_file['coverage_percentage'] = round(
                            (current_file['lines_covered'] / current_file['lines_total']) * 100, 2
                        )
                    
                    total_lines_covered += current_file['lines_covered']
                    total_lines_total += current_file['lines_total']
                    
                    coverage_data['files'].append(current_file)
                    current_file = None
            
            # Handle last file if no end_of_record
            if current_file:
                if current_file['lines_total'] > 0:
                    current_file['coverage_percentage'] = round(
                        (current_file['lines_covered'] / current_file['lines_total']) * 100, 2
                    )
                
                total_lines_covered += current_file['lines_covered']
                total_lines_total += current_file['lines_total']
                coverage_data['files'].append(current_file)
            
            # Calculate overall coverage
            coverage_data['overall']['lines_covered'] = total_lines_covered
            coverage_data['overall']['lines_total'] = total_lines_total
            
            if total_lines_total > 0:
                coverage_data['overall']['coverage_percentage'] = round(
                    (total_lines_covered / total_lines_total) * 100, 2
                )
            
            return coverage_data
            
        except Exception as e:
            self.logger.error(f"Error parsing LCOV file: {e}")
            return None
