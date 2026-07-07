<%@ Page Language="C#" %>
<%@ Import Namespace="System.IO" %>
<%@ Import Namespace="System.Linq" %>
<script runat="server">
    protected void Page_Load(object sender, EventArgs e)
    {
        string cliente = Request.QueryString["cliente"];
        string img = Request.QueryString["img"];

        if (!string.IsNullOrEmpty(img) && !string.IsNullOrEmpty(cliente))
        {
            // Servi immagine
            foreach (char c in Path.GetInvalidFileNameChars())
            {
                cliente = cliente.Replace(c.ToString(), "");
                img = img.Replace(c.ToString(), "");
            }
            string dir = @"C:\FotoCampiSolari\" + cliente;
            string path = Path.Combine(dir, img);
            if (File.Exists(path))
            {
                Response.ContentType = "image/jpeg";
                Response.BinaryWrite(File.ReadAllBytes(path));
                return;
            }
            else
            {
                Response.StatusCode = 404;
                Response.Write("File not found");
                return;
            }
        }

        // Altrimenti lista foto
        Response.ContentType = "application/json";
        try
        {
            if (string.IsNullOrEmpty(cliente))
            {
                Response.Write("[]");
                return;
            }
            foreach (char c in Path.GetInvalidFileNameChars())
                cliente = cliente.Replace(c.ToString(), "");

            string dir = @"C:\FotoCampiSolari\" + cliente;
            if (!Directory.Exists(dir))
            {
                Response.Write("[]");
                return;
            }

            var files = Directory.GetFiles(dir, "*.jpg")
                .Select(f => Path.GetFileName(f))
                .OrderByDescending(f => f)
                .ToArray();

            var json = "[" + string.Join(",", files.Select(f => "\"" + f.Replace("\"", "\\\"") + "\"")) + "]";
            Response.Write(json);
        }
        catch
        {
            Response.Write("[]");
        }
    }
</script>
