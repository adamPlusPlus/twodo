// ThemePresets.js - Predefined theme presets
export class ThemePresets {
    constructor() {
        this.presets = this.initializePresets();
    }
    
    initializePresets() {
        return {
            'default': {
                name: 'Default',
                description: 'The original dark theme with comfortable spacing and rounded corners',
                theme: {
                    background: '#1a1a1a',
                    page: {
                        background: '#2d2d2d',
                        margin: '0px',
                        padding: '20px',
                        borderRadius: '8px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
                        fontSize: '14px',
                        opacity: '1',
                        color: '#e0e0e0',
                        title: {
                            fontSize: '18px',
                            color: '#ffffff',
                            marginBottom: '15px'
                        }
                    },
                    element: {
                        background: 'transparent',
                        margin: '0px',
                        padding: '10px',
                        paddingVertical: '10px',
                        paddingHorizontal: '10px',
                        gap: '8px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
                        fontSize: '14px',
                        opacity: '1',
                        color: '#e0e0e0',
                        hoverBackground: '#363636'
                    },
                    header: {
                        fontSize: '16px',
                        color: '#b8b8b8',
                        margin: '10px 0'
                    },
                    checkbox: {
                        size: '18px'
                    }
                }
            },
            'minimal': {
                name: 'Minimal',
                description: 'Ultra-clean design with sharp edges, tight spacing, and monochrome palette',
                theme: {
                    background: '#0a0a0a',
                    page: {
                        background: '#121212',
                        margin: '0px',
                        padding: '8px',
                        borderRadius: '0px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif',
                        fontSize: '12px',
                        opacity: '1',
                        color: '#c8c8c8',
                        title: {
                            fontSize: '14px',
                            color: '#ffffff',
                            marginBottom: '6px'
                        }
                    },
                    element: {
                        background: 'transparent',
                        margin: '0px',
                        padding: '4px',
                        paddingVertical: '4px',
                        paddingHorizontal: '6px',
                        gap: '2px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif',
                        fontSize: '12px',
                        opacity: '1',
                        color: '#c8c8c8',
                        hoverBackground: '#1e1e1e'
                    },
                    header: {
                        fontSize: '13px',
                        color: '#909090',
                        margin: '4px 0'
                    },
                    checkbox: {
                        size: '14px'
                    }
                }
            },
            'spacious': {
                name: 'Spacious',
                description: 'Generous spacing, large fonts, and soft rounded corners for comfortable reading',
                theme: {
                    background: '#1e1e1e',
                    page: {
                        background: '#2a2a2a',
                        margin: '0px',
                        padding: '40px',
                        borderRadius: '16px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
                        fontSize: '17px',
                        opacity: '1',
                        color: '#e8e8e8',
                        title: {
                            fontSize: '26px',
                            color: '#ffffff',
                            marginBottom: '24px'
                        }
                    },
                    element: {
                        background: 'transparent',
                        margin: '0px',
                        padding: '18px',
                        paddingVertical: '18px',
                        paddingHorizontal: '24px',
                        gap: '14px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
                        fontSize: '17px',
                        opacity: '1',
                        color: '#e8e8e8',
                        hoverBackground: '#3a3a3a'
                    },
                    header: {
                        fontSize: '22px',
                        color: '#c0c0c0',
                        margin: '20px 0'
                    },
                    checkbox: {
                        size: '22px'
                    }
                }
            },
            'compact': {
                name: 'Compact',
                description: 'Ultra-dense layout with sharp edges for maximum information density',
                theme: {
                    background: '#0d0d0d',
                    page: {
                        background: '#181818',
                        margin: '0px',
                        padding: '4px',
                        borderRadius: '0px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif',
                        fontSize: '11px',
                        opacity: '1',
                        color: '#d0d0d0',
                        title: {
                            fontSize: '13px',
                            color: '#ffffff',
                            marginBottom: '4px'
                        }
                    },
                    element: {
                        background: 'transparent',
                        margin: '0px',
                        padding: '2px',
                        paddingVertical: '2px',
                        paddingHorizontal: '4px',
                        gap: '1px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif',
                        fontSize: '11px',
                        opacity: '1',
                        color: '#d0d0d0',
                        hoverBackground: '#252525'
                    },
                    header: {
                        fontSize: '12px',
                        color: '#a0a0a0',
                        margin: '2px 0'
                    },
                    checkbox: {
                        size: '12px'
                    }
                }
            },
            'warm': {
                name: 'Warm',
                description: 'Cozy amber and brown tones with generous rounded corners',
                theme: {
                    background: '#2a1f18',
                    page: {
                        background: '#3d2e24',
                        margin: '0px',
                        padding: '24px',
                        borderRadius: '14px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
                        fontSize: '15px',
                        opacity: '1',
                        color: '#f0e6d8',
                        title: {
                            fontSize: '20px',
                            color: '#ffedd5',
                            marginBottom: '18px'
                        }
                    },
                    element: {
                        background: 'rgba(255, 235, 205, 0.05)',
                        margin: '0px',
                        padding: '12px',
                        paddingVertical: '12px',
                        paddingHorizontal: '14px',
                        gap: '10px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
                        fontSize: '15px',
                        opacity: '1',
                        color: '#f0e6d8',
                        hoverBackground: '#4a3a2e'
                    },
                    header: {
                        fontSize: '17px',
                        color: '#d4b896',
                        margin: '12px 0'
                    },
                    checkbox: {
                        size: '19px'
                    }
                }
            },
            'cool': {
                name: 'Cool',
                description: 'Crisp blue-gray palette with sharp, modern edges',
                theme: {
                    background: '#0f1419',
                    page: {
                        background: '#1a2332',
                        margin: '0px',
                        padding: '18px',
                        borderRadius: '6px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
                        fontSize: '14px',
                        opacity: '1',
                        color: '#c8d4e0',
                        title: {
                            fontSize: '19px',
                            color: '#e0ecf8',
                            marginBottom: '14px'
                        }
                    },
                    element: {
                        background: 'rgba(100, 150, 200, 0.08)',
                        margin: '0px',
                        padding: '9px',
                        paddingVertical: '9px',
                        paddingHorizontal: '12px',
                        gap: '7px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
                        fontSize: '14px',
                        opacity: '1',
                        color: '#c8d4e0',
                        hoverBackground: '#2a3440'
                    },
                    header: {
                        fontSize: '16px',
                        color: '#8fa0b0',
                        margin: '9px 0'
                    },
                    checkbox: {
                        size: '17px'
                    }
                }
            },
            'high-contrast': {
                name: 'High Contrast',
                description: 'Maximum contrast with bold borders and sharp edges for accessibility',
                theme: {
                    background: '#000000',
                    page: {
                        background: '#0a0a0a',
                        margin: '0px',
                        padding: '24px',
                        borderRadius: '2px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
                        fontSize: '16px',
                        opacity: '1',
                        color: '#ffffff',
                        title: {
                            fontSize: '22px',
                            color: '#ffffff',
                            marginBottom: '18px'
                        }
                    },
                    element: {
                        background: '#000000',
                        margin: '0px',
                        padding: '14px',
                        paddingVertical: '14px',
                        paddingHorizontal: '16px',
                        gap: '10px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
                        fontSize: '16px',
                        opacity: '1',
                        color: '#ffffff',
                        hoverBackground: '#1a1a1a'
                    },
                    header: {
                        fontSize: '20px',
                        color: '#ffffff',
                        margin: '14px 0'
                    },
                    checkbox: {
                        size: '22px'
                    }
                }
            },
            'paper': {
                name: 'Paper',
                description: 'Light paper aesthetic with serif fonts, textures, and soft shadows',
                theme: {
                    background: '#f5f3f0',
                    backgroundTexture: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.02) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.02) 3px), repeating-linear-gradient(90deg, rgba(0,0,0,0.02) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.02) 3px)',
                    page: {
                        background: '#ffffff',
                        margin: '0px',
                        padding: '32px',
                        borderRadius: '2px',
                        fontFamily: 'Georgia, "Times New Roman", "Palatino", serif',
                        fontSize: '16px',
                        opacity: '1',
                        color: '#1a1a1a',
                        texture: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.03) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.03) 3px)',
                        shadow: '0 2px 8px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
                        title: {
                            fontSize: '24px',
                            color: '#000000',
                            marginBottom: '20px'
                        }
                    },
                    element: {
                        background: '#fafafa',
                        margin: '0px',
                        padding: '14px',
                        paddingVertical: '14px',
                        paddingHorizontal: '18px',
                        gap: '10px',
                        fontFamily: 'Georgia, "Times New Roman", "Palatino", serif',
                        fontSize: '16px',
                        opacity: '1',
                        color: '#1a1a1a',
                        hoverBackground: '#f0f0f0',
                        texture: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.015) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.015) 3px)',
                        shadow: '0 1px 3px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)'
                    },
                    header: {
                        fontSize: '19px',
                        color: '#3a3a3a',
                        margin: '14px 0'
                    },
                    checkbox: {
                        size: '19px'
                    }
                }
            },
            'terminal': {
                name: 'Terminal',
                description: 'Console aesthetic with monospace font, sharp edges, and code colors',
                theme: {
                    background: '#0a0e14',
                    page: {
                        background: '#0d1117',
                        margin: '0px',
                        padding: '12px',
                        borderRadius: '0px',
                        fontFamily: '"Courier New", "Consolas", "Monaco", "Fira Code", monospace',
                        fontSize: '13px',
                        opacity: '1',
                        color: '#a8b5c0',
                        title: {
                            fontSize: '15px',
                            color: '#58a6ff',
                            marginBottom: '10px'
                        }
                    },
                    element: {
                        background: 'transparent',
                        margin: '0px',
                        padding: '4px',
                        paddingVertical: '4px',
                        paddingHorizontal: '6px',
                        gap: '2px',
                        fontFamily: '"Courier New", "Consolas", "Monaco", "Fira Code", monospace',
                        fontSize: '13px',
                        opacity: '1',
                        color: '#a8b5c0',
                        hoverBackground: '#161b22'
                    },
                    header: {
                        fontSize: '14px',
                        color: '#7c3aed',
                        margin: '6px 0'
                    },
                    checkbox: {
                        size: '14px'
                    }
                }
            },
            'zen': {
                name: 'Zen',
                description: 'Calming light theme with soft colors, generous spacing, and rounded corners',
                theme: {
                    background: '#f8f6f4',
                    page: {
                        background: '#ffffff',
                        margin: '0px',
                        padding: '36px',
                        borderRadius: '20px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif',
                        fontSize: '16px',
                        opacity: '1',
                        color: '#2d2d2d',
                        title: {
                            fontSize: '22px',
                            color: '#1a1a1a',
                            marginBottom: '24px'
                        }
                    },
                    element: {
                        background: 'rgba(0, 0, 0, 0.02)',
                        margin: '0px',
                        padding: '16px',
                        paddingVertical: '16px',
                        paddingHorizontal: '20px',
                        gap: '12px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif',
                        fontSize: '16px',
                        opacity: '1',
                        color: '#2d2d2d',
                        hoverBackground: 'rgba(0, 0, 0, 0.04)'
                    },
                    header: {
                        fontSize: '18px',
                        color: '#4a4a4a',
                        margin: '16px 0'
                    },
                    checkbox: {
                        size: '20px'
                    }
                }
            }
        };
    }
    
    /**
     * Get all preset themes
     */
    getAllPresets() {
        return Object.keys(this.presets).map(key => ({
            id: key,
            name: this.presets[key].name,
            description: this.presets[key].description
        }));
    }
    
    /**
     * Get a preset theme by ID
     */
    getPreset(presetId) {
        return this.presets[presetId] ? { ...this.presets[presetId] } : null;
    }
    
    /**
     * Apply a preset theme globally
     */
    applyPreset(themeManager, presetId) {
        const preset = this.getPreset(presetId);
        if (preset) {
            themeManager.setGlobalTheme(preset.theme);
            return true;
        }
        return false;
    }
}

