 You’ve already shared this file. You can use the version you posted with personal data removed, such as your real MongoDB ID check.

Make sure this part inside Posts is kept generic:


{post.user === user?._id && (
  <button className="btn btn-sm btn-outline-danger" onClick={() => deletePost(post._id)}>Delete</button>
