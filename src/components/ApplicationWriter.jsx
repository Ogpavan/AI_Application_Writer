import React, { useState, useEffect, useRef } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { FaWandMagicSparkles } from 'react-icons/fa6';
 
import { MdFileDownload } from 'react-icons/md';
require('dotenv').config()

const ApplicationWriter = () => {
    const [formData, setFormData] = useState({
        receiverName: '',
        receiverAddress: '',
        date: '',
        subject: '',
        content: '',
        senderName: '',
        senderDesignation: '',
        salutation: 'Sir', // Default to "Sir"
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const contentRef = useRef(null);

    const apiKey = 'AIzaSyA7_E_faNlLw7AwgushI-zXBwB4aGZrKYY';
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
    });

    const generationConfig = {
        temperature: 1,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 8192,
        responseMimeType: "text/plain",
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });

        if (e.target.name === 'content') {
            autoResizeTextarea();
        }
    };

    const autoResizeTextarea = () => {
        if (contentRef.current) {
            contentRef.current.style.height = 'auto';
            contentRef.current.style.height = `${contentRef.current.scrollHeight}px`;
        }
    };
    const generatePdf = async () => {
                const pdfDoc = await PDFDocument.create();
                const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            
                const fontSize = 12;
                const marginLeft = 50;
                const marginTop = 50;
                const lineHeight = fontSize + 5;
                const pageHeight = 841.89; // A4 height in points
                const pageWidth = 595.28; // A4 width in points
                const textWidth = pageWidth - marginLeft * 2;
            
                const createPage = () => {
                    const page = pdfDoc.addPage([pageWidth, pageHeight]);
                    return page;
                };
            
                const drawTextOnPage = (page, text, yPosition, options = {}) => {
                    page.drawText(text, {
                        x: marginLeft,
                        y: yPosition,
                        size: fontSize,
                        font: options.font || font,
                        color: rgb(0, 0, 0),
                        ...options,
                    });
                };
            
                const addContentToPages = (wrappedTextLines) => {
                    let currentPage = createPage();
                    let yPosition = pageHeight - marginTop;
            
                    wrappedTextLines.forEach((line) => {
                        if (yPosition < marginTop) {
                            currentPage = createPage();
                            yPosition = pageHeight - marginTop;
                        }
                        drawTextOnPage(currentPage, line.text, yPosition, line.options);
                        yPosition -= lineHeight;
                    });
                };
            
                const wrapText = (text, font, fontSize, maxWidth) => {
                    const lines = text.split('\n'); // Split text into lines at newline characters
                    const wrappedLines = [];
            
                    lines.forEach((line) => {
                        const words = line.split(' ');
                        let currentLine = '';
            
                        words.forEach((word) => {
                            const testLine = currentLine ? `${currentLine} ${word}` : word;
                            const textWidth = font.widthOfTextAtSize(testLine, fontSize);
            
                            if (textWidth < maxWidth) {
                                currentLine = testLine;
                            } else {
                                if (currentLine) wrappedLines.push(currentLine);
                                currentLine = word;
                            }
                        });
            
                        if (currentLine) wrappedLines.push(currentLine);
                    });
            
                    return wrappedLines;
                };
            
                const contentLines = wrapText(formData.content, font, fontSize, textWidth);
                const addressLines = wrapText(formData.receiverAddress, font, fontSize, textWidth);
            
                const textLines = [
                    { text: `To,` },
                    { text: formData.receiverName },
                    ...addressLines.map((line) => ({ text: line })),
                    { text: '' },
                    { text: `Date: ${formData.date}` },
                    { text: '' },
                    {
                        text: `Subject: ${formData.subject}`,
                        options: { font: boldFont, underline: true }, // Bold and underline the subject
                    },
                    { text: '' },
                    { text: `Respected ${formData.salutation},` },
                  
                    { text: '' },
                    ...contentLines.map((line) => ({ text: line })),
                    { text: '' },
                    { text: 'Sincerely,' },
                    { text: formData.senderName },
                    { text: formData.senderDesignation },
                ];
            
                addContentToPages(textLines);
            
                const pdfBytes = await pdfDoc.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'Application.pdf';
                link.click();
            };
        

    const generateContent = async () => {
        setLoading(true);
        setError('');

        try {
            const chatSession = model.startChat({
                generationConfig,
                history: [],
            });

            const inputPrompt = `Please generate the content for an application based on the subject: "${formData.subject}". I only need the body content, not the full letter format , create details on your own and don't use dear ,write as student  `
            const result = await chatSession.sendMessage( inputPrompt );
            setFormData({
                ...formData,
                content: result.response.text(), // Update content with AI-generated response
            });
        } catch (err) {
            setError('Failed to generate content.');
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateContent = async (e) => {
        e.preventDefault();
        if (formData.subject) {
            await generateContent();
        } else {
            setError('Please enter a subject.');
        }
    };
    useEffect(() => {
        autoResizeTextarea(); // Adjust on initial load or when data changes
    }, [formData.content]);


    return (
        <div className="p-4  ">
            <h2 className="text-3xl font-bold mb-4 text-center poppins-bold py-10">AI Application Writer</h2>
            <form className='container space-y-5 min-w-[300px] sm:w-[600px]'>
            <p className='poppins-medium'>To,</p>
                <div>
                    <label className='poppins-medium  '>Receiver Name or Post:</label>
                    <input
                        type="text"
                        name="receiverName"
                        value={formData.receiverName}
                        onChange={handleChange}
                        className=" poppins-light  "
                        placeholder='e.g The Principal '
                    />
                </div>
                <div>
                    <label className='poppins-medium text-gray-700'>College/School Name:</label>
                    <textarea
                        name="receiverAddress"
                        value={formData.receiverAddress}
                        onChange={handleChange}
                        className=" poppins-light overflow-y-hidden"
                        placeholder='e.g. Khandelwal College Of Management, Bareilly'
                    />
                </div>
                <div>
                    <label className='poppins-medium text-gray-700'>Date:</label>
                    <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        className=" poppins-light text-gray-700"
                    />
                </div>
                <div>
                    <label className='poppins-medium text-gray-700'>Subject:</label>
                    <input
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        className=" poppins-light"
                        placeholder='e.g. Application for sick leave'
                        required
                    />
                
                    <label className='poppins-medium text-gray-700'>Respected:</label>
                    <select
                        name="salutation"
                        value={formData.salutation}
                        onChange={handleChange}
                        className=" poppins-light"
                    >
                        <option value="Sir">Sir</option>
                        <option value="Mam">Mam</option>
                    </select>
                </div>
                <div>
                    <label className='poppins-medium text-gray-700'>Content:</label>
                    <textarea
                        name="content"
                        value={formData.content}
                        onChange={handleChange}
                        ref={contentRef}
                        className=" poppins-light"
                        style={{ overflow: 'hidden', resize: 'none' }}
                        placeholder='Your content goes here ... '
                    />
                        <button
                        type="button"
                        onClick={handleGenerateContent}
                        className="bg-gradient-to-r from-emerald-400 to-teal-400   p-2 mt-2 poppins-medium flex items-center justify-center text-sm gap-1"
                        disabled={loading}
                    ><FaWandMagicSparkles />
                        {loading ? 'Writing...' : 'Generate Content using AI'}
                    </button>
                </div>
                {error && <p className="text-red-500 text-center">{error}</p>}
                <div>
                </div>
                <div>
                    <label  className='poppins-medium text-gray-700'>Your Name:</label>
                    <input
                        type="text"
                        name="senderName"
                        value={formData.senderName}
                        onChange={handleChange}
                        className=" poppins-light"
                        placeholder='e.g. John Doe'
                    />
                </div>
                <div>
                    <label  className='poppins-medium text-gray-700'>Your Class:</label>
                    <input
                        type="text"
                        name="senderDesignation"
                        value={formData.senderDesignation}
                        onChange={handleChange}
                        className=" poppins-light"
                        placeholder='e.g. BCA 3rd year'
                    />
                </div>
                <button
                    type="button"
                    onClick={generatePdf}
                    className=" text-white p-2 mt-4 poppins-medium bg-gradient-to-r from-blue-500 to-cyan-300 flex items-center justify-center text-sm gap-1"
                ><MdFileDownload className='text-xl' />
                    Download PDF
                </button>
            </form>
        </div>
    );
};

export default ApplicationWriter;



 