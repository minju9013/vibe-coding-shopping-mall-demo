import { memo } from "react";
import "./HomeFooter.css";

export const HomeFooter = memo(function HomeFooter() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <h3 className="footer-logo">KINETIC</h3>
          <p className="footer-desc">
            Redefining the essence of human performance
            through innovation, beauty and dedication.
          </p>
          <div className="footer-socials">
            <span>📘</span>
            <span>©</span>
            <span>📸</span>
          </div>
        </div>
        <div className="footer-links-group">
          <div className="footer-col">
            <h4>SHOP</h4>
            <a href="#men">Men</a>
            <a href="#women">Women</a>
            <a href="#accessories">Accessories</a>
            <a href="#new">New Arrivals</a>
          </div>
          <div className="footer-col">
            <h4>HELP</h4>
            <a href="#faq">FAQ</a>
            <a href="#shipping">Shipping</a>
            <a href="#returns">Returns</a>
            <a href="#contact">Contact Us</a>
          </div>
          <div className="footer-col">
            <h4>COMPANY</h4>
            <a href="#about">About Us</a>
            <a href="#careers">Careers</a>
            <a href="#press">Press</a>
            <a href="#sustainability">Sustainability</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2026 KINETIC PERFORMANCE. ALL RIGHTS RESERVED.</p>
      </div>
    </footer>
  );
});

export default HomeFooter;
