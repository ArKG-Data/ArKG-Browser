import { useState, useEffect } from 'react';
import axios from "axios";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import 'github-markdown-css/github-markdown-light.css'

const MarkdownViewer = ({url}) => {

    const [markdown, setMarkdown] = useState('')
    
    useEffect(() => { getMarkdown() }, [])
    
    const getMarkdown = async () => {
    
    axios.get(url).then(response => {
        if (response.status != 200) {
            throw new Error(`Error Http status: ${response.status}`);
        }
        return response.data;
        }).then(data => {
                setMarkdown(data);
        }).catch(error => {
                console.error('Error fetching markdown:', error);
        });
    }
    
    return (
        <div className='markdown-body'>
            {markdown != '' ? (
                    <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{markdown}</Markdown>
                    ): (<Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>Loading...</Markdown>)}
        </div>
    )

}

export default MarkdownViewer;