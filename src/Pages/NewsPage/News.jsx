import "./News.css"
import MarkdownViewer from "../../Components/Navbar/MarkdownViewer/Markdown";

const NewsPage = () => {
  return (
    <div className='news-container'>
      <MarkdownViewer url={'https://raw.githubusercontent.com/ArKG-Data/ArKG-docs/refs/heads/main/news.md'}/>
    </div>
  );
};

export default NewsPage;
