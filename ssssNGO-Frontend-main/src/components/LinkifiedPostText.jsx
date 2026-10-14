import { linkifyPostText } from "../utils/linkifyPostText";

const LinkifiedPostText = ({ text }) => (
  <>
    {linkifyPostText(text).map((part, index) =>
      part.type === "link" ? (
        <a
          key={`${part.href}-${index}`}
          href={part.href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="break-all font-medium text-blue-700 underline decoration-blue-400 underline-offset-2 hover:text-blue-900"
        >
          {part.text}
        </a>
      ) : (
        <span key={`text-${index}`}>{part.text}</span>
      ),
    )}
  </>
);

export default LinkifiedPostText;
