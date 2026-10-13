import logo from "../assets/logo.png";

const ORGANISATION_LOGO_ALT = "Swabhiman Shiksha Sanskriti Samajotthan Nyas logo";

const OrganisationLogo = ({ className = "", decorative = false, ...props }) => (
  <img
    src={logo}
    alt={decorative ? "" : ORGANISATION_LOGO_ALT}
    className={`object-contain ${className}`.trim()}
    draggable="false"
    {...props}
  />
);

export default OrganisationLogo;
