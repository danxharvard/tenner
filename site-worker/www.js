// www.tenner.stream → tenner.stream, keeping the path and query
export default {
  fetch(request) {
    const url = new URL(request.url);
    url.hostname = 'tenner.stream';
    return Response.redirect(url.toString(), 301);
  },
};
